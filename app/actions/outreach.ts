'use server'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDomainEmails, HunterApiError } from '@/lib/outreach/hunter'
import { fetchDomainMetrics, AhrefsApiError } from '@/lib/outreach/ahrefs'
import { scrapeLinkedInTitle, LinkedInScrapeError } from '@/lib/outreach/linkedin'
import { findExternalBio, scrapeTwitterBio } from '@/lib/outreach/external-bio'
import { searchEditorArticles, parseSerperDate, SerperApiError } from '@/lib/outreach/serper'
import {
  scoreEditorProfile,
  analyzeArticleTitle,
  scoreEditorTopical,
  computeCombinedScore,
} from '@/lib/outreach/scorer'
import { canUseQuota, getUsage, incrementUsage } from '@/lib/outreach/quota'
import { getPitchTemplate, fillTemplate, type AnchorType } from '@/lib/outreach/pitch-templates'

// ---------------------------------------------------------------------------
// Auth helper — mirrors app/actions/admin.ts#verifyAdmin
// ---------------------------------------------------------------------------
async function verifyAdmin(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', claims.sub)
    .single()

  if (profile?.role !== 'admin') return { error: 'Unauthorized' }
  return { userId: claims.sub }
}

// ---------------------------------------------------------------------------
// seedDomains — parses docs/seo/hunter-domains.csv into outreach_domains
// Idempotent: uses UNIQUE constraint on domain to avoid duplicates.
// ---------------------------------------------------------------------------

interface DomainRow {
  domain: string
  outlet: string
  tier: string
  priority: string
  notes: string
}

function parseHunterDomainsCsv(): DomainRow[] {
  const csvPath = join(process.cwd(), 'docs', 'seo', 'hunter-domains.csv')
  const content = readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter((l) => l.trim())
  const header = lines[0].split(',')
  const idxDomain = header.indexOf('domain')
  const idxOutlet = header.indexOf('outlet')
  const idxTier = header.indexOf('tier')
  const idxPriority = header.indexOf('priority')
  const idxNotes = header.indexOf('notes')

  return lines.slice(1).map((line) => {
    // Simple CSV parse — no quoted fields in our source
    const cells = line.split(',')
    return {
      domain: cells[idxDomain]?.trim() ?? '',
      outlet: cells[idxOutlet]?.trim() ?? '',
      tier: cells[idxTier]?.trim() ?? '',
      priority: cells[idxPriority]?.trim() ?? '',
      notes: cells[idxNotes]?.trim() ?? '',
    }
  }).filter((r) => r.domain && r.outlet)
}

export async function seedDomains(): Promise<{ error: string | null; inserted: number; skipped: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, inserted: 0, skipped: 0 }

  let rows: DomainRow[]
  try {
    rows = parseHunterDomainsCsv()
  } catch (err) {
    return {
      error: `Failed to read hunter-domains.csv: ${err instanceof Error ? err.message : String(err)}`,
      inserted: 0,
      skipped: 0,
    }
  }

  const admin = createAdminClient()
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const { error } = await admin.from('outreach_domains').insert({
      domain: row.domain,
      outlet_name: row.outlet,
      tier: row.tier,
      priority: row.priority,
      notes: row.notes || null,
    })
    if (error) {
      // Duplicate key (domain already exists) — skip silently
      if (error.code === '23505') skipped++
      else console.error(`[seedDomains] Insert failed for ${row.domain}:`, error.message)
    } else {
      inserted++
    }
  }

  revalidatePath('/admin')
  return { error: null, inserted, skipped }
}

// ---------------------------------------------------------------------------
// Future actions — stubbed for Phase 2+ so the UI can import them safely.
// Will be implemented as each phase lands.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// fullyEnrichEditor — best-effort run of every enrichment step for one editor:
// fetch articles (Serper), scrape bio page (Serper + ScrapingBee), AI summary
// (ScrapingBee + OpenAI), and LinkedIn headline (ScrapingBee premium proxy).
// Called inline from discoverEditors so Discover is a "do everything" action.
// Each step swallows its own errors to keep the pipeline going.
// ---------------------------------------------------------------------------
async function fullyEnrichEditor(
  admin: ReturnType<typeof createAdminClient>,
  editorId: string,
  firstName: string | null,
  lastName: string | null,
  linkedinUrl: string | null,
  twitterHandle: string | null,
  domain: string,
  emailForLogs: string
): Promise<void> {
  // 1) Fetch articles via Serper
  if (firstName && lastName) {
    try {
      if (await canUseQuota(admin, 'serper')) {
        const serperResults = await searchEditorArticles(firstName, lastName, domain)
        await incrementUsage(admin, 'serper')

        const scores: number[] = []
        for (const r of serperResults) {
          const { score, matchedKeywords } = analyzeArticleTitle({ title: r.title, snippet: r.snippet })
          scores.push(score)
          await admin.from('outreach_articles').insert({
            editor_id: editorId,
            url: r.link,
            title: r.title,
            snippet: r.snippet ?? null,
            published_date: parseSerperDate(r.date),
            topic_match_score: score,
            topic_keywords: matchedKeywords,
            serper_raw: r as unknown as Record<string, unknown>,
          })
        }
        await admin
          .from('outreach_editors')
          .update({
            topical_score: scoreEditorTopical(scores),
            articles_fetched_at: new Date().toISOString(),
          })
          .eq('id', editorId)
      }
    } catch (err) {
      console.error(`[fullyEnrichEditor:articles] ${emailForLogs}:`, err instanceof Error ? err.message : err)
    }
  }

  // 2) Bio scrape (Serper search for author page + ScrapingBee fetch)
  if (firstName && lastName) {
    try {
      const serperOk = await canUseQuota(admin, 'serper')
      const sbOk = await canUseQuota(admin, 'scrapingbee')
      if (serperOk && sbOk) {
        const { findAndFetchEditorBioPage } = await import('@/lib/outreach/scrapingbee')
        const { extractBio } = await import('@/lib/outreach/bio-extractor')
        const apiKey = process.env.SERPER_API_KEY
        const serperSearch = async (q: string) => {
          const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey!, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q, num: 5, gl: 'ae', hl: 'en' }),
          })
          if (!res.ok) throw new Error(`Serper error ${res.status}`)
          const data = await res.json()
          return (data.organic ?? []).map((r: { link: string; title: string }) => ({ link: r.link, title: r.title }))
        }
        const fetchResult = await findAndFetchEditorBioPage(firstName, lastName, domain, serperSearch)
        await incrementUsage(admin, 'serper')
        if (fetchResult) {
          await incrementUsage(admin, 'scrapingbee')
          const bioText = extractBio(fetchResult.html)
          await admin
            .from('outreach_editors')
            .update({
              bio_text: bioText,
              bio_url: fetchResult.url,
              bio_fetched_at: new Date().toISOString(),
            })
            .eq('id', editorId)
        } else {
          await admin
            .from('outreach_editors')
            .update({ bio_fetched_at: new Date().toISOString() })
            .eq('id', editorId)
        }
      }
    } catch (err) {
      console.error(`[fullyEnrichEditor:bio] ${emailForLogs}:`, err instanceof Error ? err.message : err)
    }
  }

  // 2b) External bio (Muckrack / Contently / personal site)
  if (firstName && lastName) {
    try {
      const serperOk = await canUseQuota(admin, 'serper')
      const sbOk = await canUseQuota(admin, 'scrapingbee')
      if (serperOk && sbOk) {
        const apiKey = process.env.SERPER_API_KEY
        const serperSearch = async (q: string) => {
          const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey!, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q, num: 10, gl: 'ae', hl: 'en' }),
          })
          if (!res.ok) throw new Error(`Serper error ${res.status}`)
          const data = await res.json()
          return (data.organic ?? []).map((r: { link: string; title: string }) => ({ link: r.link, title: r.title }))
        }
        const external = await findExternalBio(firstName, lastName, domain, serperSearch)
        await incrementUsage(admin, 'serper')
        if (external) {
          await incrementUsage(admin, 'scrapingbee')
          await admin
            .from('outreach_editors')
            .update({
              external_bio_text: external.text,
              external_bio_url: external.url,
              external_bio_source: external.source,
              external_fetched_at: new Date().toISOString(),
            })
            .eq('id', editorId)
        } else {
          await admin
            .from('outreach_editors')
            .update({ external_fetched_at: new Date().toISOString() })
            .eq('id', editorId)
        }
      }
    } catch (err) {
      console.error(`[fullyEnrichEditor:external-bio] ${emailForLogs}:`, err instanceof Error ? err.message : err)
    }
  }

  // 2c) Twitter / X bio
  if (twitterHandle) {
    try {
      if (await canUseQuota(admin, 'scrapingbee')) {
        const bio = await scrapeTwitterBio(twitterHandle)
        await incrementUsage(admin, 'scrapingbee')
        if (bio) {
          await admin
            .from('outreach_editors')
            .update({ twitter_bio: bio })
            .eq('id', editorId)
        }
      }
    } catch (err) {
      console.error(`[fullyEnrichEditor:twitter] ${emailForLogs}:`, err instanceof Error ? err.message : err)
    }
  }

  // 3) AI coverage summary (fetches full article text + summarizes)
  try {
    // Only run if we inserted articles in step 1
    const { count } = await admin
      .from('outreach_articles')
      .select('id', { count: 'exact', head: true })
      .eq('editor_id', editorId)
    if ((count ?? 0) > 0) {
      await enrichEditorArticles(editorId)
    }
  } catch (err) {
    console.error(`[fullyEnrichEditor:ai-summary] ${emailForLogs}:`, err instanceof Error ? err.message : err)
  }

  // Step renumbered above — LinkedIn is step 4
  if (linkedinUrl) {
    try {
      if (await canUseQuota(admin, 'scrapingbee')) {
        const title = await scrapeLinkedInTitle(linkedinUrl, firstName, lastName)
        await incrementUsage(admin, 'scrapingbee')
        await admin
          .from('outreach_editors')
          .update({
            linkedin_title: title,
            linkedin_scraped_at: new Date().toISOString(),
          })
          .eq('id', editorId)
      }
    } catch (err) {
      console.error(`[fullyEnrichEditor:linkedin] ${emailForLogs}:`, err instanceof Error ? err.message : err)
    }
  }

  // 5) Final rescore so everything we just gathered is reflected in combined_score
  try {
    await rescoreEditor(editorId, admin)
  } catch (err) {
    console.error(`[fullyEnrichEditor:rescore] ${emailForLogs}:`, err instanceof Error ? err.message : err)
  }
}

export async function discoverEditors(
  domainId: string
): Promise<{ error: string | null; inserted: number; skipped: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, inserted: 0, skipped: 0 }

  const admin = createAdminClient()

  // Fetch domain details
  const { data: domain, error: domainErr } = await admin
    .from('outreach_domains')
    .select('id, domain, priority, priority_score')
    .eq('id', domainId)
    .single()

  if (domainErr || !domain) {
    return { error: 'Domain not found', inserted: 0, skipped: 0 }
  }

  // Check Hunter quota
  const canUse = await canUseQuota(admin, 'hunter')
  if (!canUse) {
    const { used, limit } = await getUsage(admin, 'hunter')
    return {
      error: `Hunter monthly quota reached (${used}/${limit}). Resets on the 1st.`,
      inserted: 0,
      skipped: 0,
    }
  }

  // Call Hunter API
  let hunterData
  try {
    hunterData = await fetchDomainEmails(domain.domain)
  } catch (err) {
    const msg = err instanceof HunterApiError
      ? err.message
      : (err instanceof Error ? err.message : 'Unknown Hunter error')
    return { error: msg, inserted: 0, skipped: 0 }
  }

  // Increment quota immediately after successful call
  await incrementUsage(admin, 'hunter')

  // Parse emails, score, insert
  let inserted = 0
  let skipped = 0

  for (const email of hunterData.data.emails) {
    const profileScore = scoreEditorProfile({
      position: email.position,
      seniority: email.seniority,
      department: email.department,
      confidence: email.confidence,
      outletPriorityScore: typeof domain.priority_score === 'number' ? domain.priority_score : 50,
    })

    // Skip zero-scored editors (sales/HR/off-topic) — don't pollute the list
    if (profileScore === 0) {
      skipped++
      continue
    }

    const combinedScore = computeCombinedScore(profileScore, null)

    const { data: insertedRow, error: insErr } = await admin
      .from('outreach_editors')
      .insert({
        domain_id: domain.id,
        email: email.value,
        first_name: email.first_name,
        last_name: email.last_name,
        position: email.position,
        seniority: email.seniority,
        department: email.department,
        linkedin_url: email.linkedin,
        twitter_handle: email.twitter,
        confidence: email.confidence,
        relevance_score: profileScore,
        topical_score: null,
        combined_score: combinedScore,
        hunter_raw: email,
      })
      .select('id')
      .single()

    if (insErr) {
      if (insErr.code === '23505') skipped++  // duplicate email for this domain
      else console.error(`[discoverEditors] Insert failed for ${email.value}:`, insErr.message)
    } else {
      inserted++

      // Full auto-enrichment pipeline for this editor. Each step is
      // best-effort: a single failure or quota-exhaustion does not halt
      // the others. Final rescore picks up whatever enrichment succeeded.
      if (insertedRow?.id) {
        await fullyEnrichEditor(
          admin,
          insertedRow.id,
          email.first_name,
          email.last_name,
          email.linkedin,
          email.twitter,
          domain.domain,
          email.value
        )
      }
    }
  }

  // Mark the domain as searched
  await admin
    .from('outreach_domains')
    .update({ hunter_searched_at: new Date().toISOString() })
    .eq('id', domain.id)

  revalidatePath('/admin')
  return { error: null, inserted, skipped }
}

export async function fetchEditorArticles(
  editorId: string
): Promise<{ error: string | null; inserted: number; topicalScore: number | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, inserted: 0, topicalScore: null }

  const admin = createAdminClient()

  // Fetch editor + their domain
  const { data: editor, error: editorErr } = await admin
    .from('outreach_editors')
    .select('id, first_name, last_name, relevance_score, outreach_domains (domain)')
    .eq('id', editorId)
    .single()

  if (editorErr || !editor) return { error: 'Editor not found', inserted: 0, topicalScore: null }
  if (!editor.first_name || !editor.last_name) {
    return { error: 'Editor has no name — Serper search requires both first and last name', inserted: 0, topicalScore: null }
  }

  const domainRow = Array.isArray(editor.outreach_domains) ? editor.outreach_domains[0] : editor.outreach_domains
  if (!domainRow?.domain) return { error: 'Editor has no associated domain', inserted: 0, topicalScore: null }

  // Quota check
  const canUse = await canUseQuota(admin, 'serper')
  if (!canUse) {
    const { used, limit } = await getUsage(admin, 'serper')
    return {
      error: `Serper monthly quota reached (${used}/${limit}). Resets on the 1st.`,
      inserted: 0,
      topicalScore: null,
    }
  }

  // Call Serper API
  let results
  try {
    results = await searchEditorArticles(editor.first_name, editor.last_name, domainRow.domain)
  } catch (err) {
    const msg = err instanceof SerperApiError
      ? err.message
      : (err instanceof Error ? err.message : 'Unknown Serper error')
    return { error: msg, inserted: 0, topicalScore: null }
  }

  await incrementUsage(admin, 'serper')

  // Delete existing articles for this editor (refresh semantics)
  await admin.from('outreach_articles').delete().eq('editor_id', editorId)

  // Analyze and insert each article
  let inserted = 0
  const articleScores: number[] = []

  for (const r of results) {
    const { score, matchedKeywords } = analyzeArticleTitle({
      title: r.title,
      snippet: r.snippet,
    })
    articleScores.push(score)

    const { error: insErr } = await admin.from('outreach_articles').insert({
      editor_id: editorId,
      url: r.link,
      title: r.title,
      snippet: r.snippet ?? null,
      published_date: parseSerperDate(r.date),
      topic_match_score: score,
      topic_keywords: matchedKeywords,
      serper_raw: r as unknown as Record<string, unknown>,
    })
    if (!insErr) inserted++
    else if (insErr.code !== '23505') {
      console.error(`[fetchEditorArticles] Insert failed for ${r.link}:`, insErr.message)
    }
  }

  // Persist topical + mark fetched, then run full rescore so profile picks
  // up any enrichment text (bio, linkedin, ai summary) at the same time.
  const topicalScore = scoreEditorTopical(articleScores)

  await admin
    .from('outreach_editors')
    .update({
      topical_score: topicalScore,
      articles_fetched_at: new Date().toISOString(),
    })
    .eq('id', editorId)

  await rescoreEditor(editorId, admin)

  revalidatePath('/admin')
  return { error: null, inserted, topicalScore }
}

// ---------------------------------------------------------------------------
// Pitch composer actions
// ---------------------------------------------------------------------------

export interface DraftPitchResult {
  error: string | null
  pitch?: {
    subject: string
    body: string
    targetUrl: string
    anchorType: AnchorType
    anchorText: string
  }
  editorEmail?: string
}

/**
 * Generate a drafted pitch (not saved yet). Returns the filled template
 * ready for the composer to display. The actual "send" action is
 * updatePitchStatus(pitchId, 'sent').
 */
export async function draftPitch(
  editorId: string,
  angleId: string
): Promise<DraftPitchResult> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const template = getPitchTemplate(angleId)
  if (!template) return { error: `Unknown pitch angle: ${angleId}` }

  const admin = createAdminClient()
  const { data: editor, error } = await admin
    .from('outreach_editors')
    .select('email, first_name, position, outreach_domains (outlet_name)')
    .eq('id', editorId)
    .single()

  if (error || !editor) return { error: 'Editor not found' }

  const domain = Array.isArray(editor.outreach_domains) ? editor.outreach_domains[0] : editor.outreach_domains
  const outletName = domain?.outlet_name ?? 'your publication'

  const filled = fillTemplate(template, {
    editorFirstName: editor.first_name,
    outletName,
    position: editor.position,
  })

  return {
    error: null,
    pitch: {
      subject: filled.subject,
      body: filled.body,
      targetUrl: template.targetUrl,
      anchorType: template.anchorType,
      anchorText: template.anchorText,
    },
    editorEmail: editor.email,
  }
}

/**
 * Save a pitch as sent. Inserts outreach_pitches row and updates
 * outreach_editors.contacted_at.
 */
export async function savePitchAsSent(
  editorId: string,
  angleId: string,
  subject: string,
  body: string,
  targetUrl: string,
  anchorType: AnchorType,
  anchorText: string
): Promise<{ error: string | null; pitchId?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('outreach_pitches')
    .insert({
      editor_id: editorId,
      pitch_angle: angleId,
      target_url: targetUrl,
      anchor_type: anchorType,
      anchor_text: anchorText,
      subject,
      body,
      status: 'sent',
      sent_at: now,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Mark editor as contacted
  await admin
    .from('outreach_editors')
    .update({ contacted_at: now })
    .eq('id', editorId)

  revalidatePath('/admin')
  return { error: null, pitchId: data?.id }
}

/**
 * Update a pitch's status (replied / published / rejected) with optional metadata.
 */
export async function updatePitchStatus(
  pitchId: string,
  status: 'sent' | 'replied' | 'published' | 'rejected',
  metadata?: { publishedUrl?: string; notes?: string }
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const update: Record<string, unknown> = { status }
  if (status === 'replied') update.replied_at = now
  if (status === 'published') {
    update.published_at = now
    if (metadata?.publishedUrl) update.published_url = metadata.publishedUrl
  }
  if (metadata?.notes !== undefined) update.notes = metadata.notes

  const { error } = await admin
    .from('outreach_pitches')
    .update(update)
    .eq('id', pitchId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { error: null }
}

// ---------------------------------------------------------------------------
// AI pitch personalization (Phase 6)
// ---------------------------------------------------------------------------

export async function generatePitchOpener(
  editorId: string,
  angleId: string
): Promise<{ error: string | null; opener: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, opener: '' }

  const { getPitchTemplate: getTemplate } = await import('@/lib/outreach/pitch-templates')
  const { generateOpener } = await import('@/lib/outreach/ai-personalizer')

  const template = getTemplate(angleId)
  if (!template) return { error: `Unknown pitch angle: ${angleId}`, opener: '' }

  const admin = createAdminClient()
  const { data: editor, error: editorErr } = await admin
    .from('outreach_editors')
    .select('first_name, last_name, position, bio_text, ai_summary, outreach_domains (outlet_name, domain)')
    .eq('id', editorId)
    .single()

  if (editorErr || !editor) return { error: 'Editor not found', opener: '' }

  const domainRow = Array.isArray(editor.outreach_domains) ? editor.outreach_domains[0] : editor.outreach_domains
  const outletName = domainRow?.outlet_name ?? 'your publication'
  const outletDomain = domainRow?.domain ?? ''

  // Fetch top article titles for context
  const { data: articles } = await admin
    .from('outreach_articles')
    .select('title')
    .eq('editor_id', editorId)
    .order('topic_match_score', { ascending: false })
    .limit(5)

  const recentArticleTitles = (articles ?? []).map((a) => a.title)

  const result = await generateOpener({
    editorFirstName: editor.first_name,
    editorLastName: editor.last_name,
    position: editor.position,
    outletName,
    outletDomain,
    pitchAngleName: template.name,
    pitchAngleDescription: template.description,
    recentArticleTitles,
    bioText: editor.bio_text ?? null,
    aiSummary: editor.ai_summary ?? null,
  })

  if (result.error) return { error: result.error, opener: '' }
  return { error: null, opener: result.opener }
}

// ---------------------------------------------------------------------------
// Editor bio scraping (Phase 7)
// ---------------------------------------------------------------------------

export async function scrapeEditorBio(
  editorId: string
): Promise<{ error: string | null; bioText: string | null; bioUrl: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, bioText: null, bioUrl: null }

  const admin = createAdminClient()
  const { data: editor, error: editorErr } = await admin
    .from('outreach_editors')
    .select('first_name, last_name, outreach_domains (domain)')
    .eq('id', editorId)
    .single()

  if (editorErr || !editor) return { error: 'Editor not found', bioText: null, bioUrl: null }
  if (!editor.first_name || !editor.last_name) {
    return { error: 'Editor needs both first + last name', bioText: null, bioUrl: null }
  }
  const domainRow = Array.isArray(editor.outreach_domains) ? editor.outreach_domains[0] : editor.outreach_domains
  if (!domainRow?.domain) return { error: 'No domain', bioText: null, bioUrl: null }

  // Check both Serper quota (for finding bio URL) and ScrapingBee quota
  const serperOk = await canUseQuota(admin, 'serper')
  const sbOk = await canUseQuota(admin, 'scrapingbee')
  if (!serperOk) {
    const { used, limit } = await getUsage(admin, 'serper')
    return { error: `Serper monthly quota reached (${used}/${limit})`, bioText: null, bioUrl: null }
  }
  if (!sbOk) {
    const { used, limit } = await getUsage(admin, 'scrapingbee')
    return { error: `ScrapingBee monthly quota reached (${used}/${limit})`, bioText: null, bioUrl: null }
  }

  const { findAndFetchEditorBioPage, ScrapingBeeError } = await import('@/lib/outreach/scrapingbee')
  const { extractBio } = await import('@/lib/outreach/bio-extractor')
  const { searchEditorArticles: _, SerperApiError: _SE } = await import('@/lib/outreach/serper')

  // Use Serper to find bio page
  const apiKey = process.env.SERPER_API_KEY
  const serperSearch = async (q: string) => {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, num: 5, gl: 'ae', hl: 'en' }),
    })
    if (!res.ok) throw new Error(`Serper error ${res.status}`)
    const data = await res.json()
    return (data.organic ?? []).map((r: { link: string; title: string }) => ({ link: r.link, title: r.title }))
  }

  let fetchResult
  try {
    fetchResult = await findAndFetchEditorBioPage(editor.first_name, editor.last_name, domainRow.domain, serperSearch)
    // Both Serper and ScrapingBee were called if we got here with success
    await incrementUsage(admin, 'serper')
    if (fetchResult) await incrementUsage(admin, 'scrapingbee')
  } catch (err) {
    const msg = err instanceof ScrapingBeeError ? err.message
      : err instanceof Error ? err.message : 'Unknown scrape error'
    return { error: msg, bioText: null, bioUrl: null }
  }

  if (!fetchResult) {
    // Mark attempted (no bio found) so UI shows "searched, 0 found"
    await admin
      .from('outreach_editors')
      .update({ bio_fetched_at: new Date().toISOString() })
      .eq('id', editorId)
    revalidatePath('/admin')
    return { error: 'No author/bio page found in Google results', bioText: null, bioUrl: null }
  }

  const bioText = extractBio(fetchResult.html)
  const now = new Date().toISOString()

  await admin
    .from('outreach_editors')
    .update({
      bio_text: bioText,
      bio_url: fetchResult.url,
      bio_fetched_at: now,
    })
    .eq('id', editorId)

  // Rescore with bio folded into profile enrichment (title keyword matches
  // against the bio text are now reflected in profile_score).
  await rescoreEditor(editorId, admin)

  revalidatePath('/admin')
  return { error: null, bioText, bioUrl: fetchResult.url }
}

// ---------------------------------------------------------------------------
// Full-article enrichment + AI summary (Phase 8)
// ---------------------------------------------------------------------------

export async function enrichEditorArticles(
  editorId: string
): Promise<{ error: string | null; fetched: number; summary: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, fetched: 0, summary: null }

  const admin = createAdminClient()
  const { data: editor, error: editorErr } = await admin
    .from('outreach_editors')
    .select('first_name, last_name, outreach_domains (outlet_name)')
    .eq('id', editorId)
    .single()

  if (editorErr || !editor) return { error: 'Editor not found', fetched: 0, summary: null }
  const domainRow = Array.isArray(editor.outreach_domains) ? editor.outreach_domains[0] : editor.outreach_domains
  const outletName = domainRow?.outlet_name ?? 'the outlet'

  // Get top 3 articles by topic_match_score
  const { data: topArticles } = await admin
    .from('outreach_articles')
    .select('id, url, title, full_text')
    .eq('editor_id', editorId)
    .order('topic_match_score', { ascending: false })
    .limit(3)

  if (!topArticles || topArticles.length === 0) {
    return { error: 'No articles to enrich. Fetch articles first.', fetched: 0, summary: null }
  }

  // Quota check for ScrapingBee (3 calls)
  const { used, limit } = await getUsage(admin, 'scrapingbee')
  if (used + 3 > limit) {
    return { error: `ScrapingBee quota would exceed limit (${used}/${limit}, need 3)`, fetched: 0, summary: null }
  }

  const { fetchArticleText } = await import('@/lib/outreach/article-fetcher')
  const { summarizeForEditor } = await import('@/lib/outreach/article-summarizer')

  // Fetch full text for each (skip if already stored)
  const enriched: Array<{ title: string; text: string }> = []
  let fetchedCount = 0

  for (const a of topArticles) {
    if (a.full_text && a.full_text.length > 200) {
      enriched.push({ title: a.title, text: a.full_text })
      continue
    }
    const text = await fetchArticleText(a.url)
    await incrementUsage(admin, 'scrapingbee')
    if (text) {
      await admin.from('outreach_articles').update({ full_text: text }).eq('id', a.id)
      enriched.push({ title: a.title, text })
      fetchedCount++
    }
  }

  if (enriched.length === 0) {
    return { error: 'No articles could be fetched (all blocked or empty)', fetched: 0, summary: null }
  }

  // Generate summary
  const editorName = [editor.first_name, editor.last_name].filter(Boolean).join(' ') || 'the editor'
  const { summary, error: sumErr } = await summarizeForEditor({
    editorName,
    outletName,
    articles: enriched,
  })

  if (sumErr) {
    console.error('[enrichEditorArticles] Summary error:', sumErr)
  } else {
    await admin
      .from('outreach_editors')
      .update({ ai_summary: summary })
      .eq('id', editorId)
    // Fold the AI summary into the profile score
    await rescoreEditor(editorId, admin)
  }

  revalidatePath('/admin')
  return {
    error: sumErr,
    fetched: fetchedCount,
    summary: summary || null,
  }
}

// ---------------------------------------------------------------------------
// Gmail OAuth + reply detection (Phase 9)
// ---------------------------------------------------------------------------

export async function getGoogleAuthUrl(): Promise<{ error: string | null; url: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, url: null }

  try {
    const { buildAuthUrl } = await import('@/lib/outreach/gmail')
    const state = auth.userId // tie the OAuth request back to the admin
    const url = buildAuthUrl(state)
    return { error: null, url }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to build auth URL',
      url: null,
    }
  }
}

export async function getGmailConnection(): Promise<{
  connected: boolean
  email: string | null
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { connected: false, email: null }

  const admin = createAdminClient()
  const { data } = await admin
    .from('outreach_oauth_tokens')
    .select('email, refresh_token')
    .eq('provider', 'google')
    .eq('admin_user_id', auth.userId)
    .maybeSingle()

  return {
    connected: !!data?.refresh_token,
    email: data?.email ?? null,
  }
}

export async function disconnectGmail(): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  await admin
    .from('outreach_oauth_tokens')
    .delete()
    .eq('provider', 'google')
    .eq('admin_user_id', auth.userId)

  revalidatePath('/admin')
  return { error: null }
}

export async function checkForReplies(): Promise<{
  error: string | null
  checked: number
  matched: number
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, checked: 0, matched: 0 }

  const admin = createAdminClient()

  // Load stored refresh token
  const { data: tokenRow } = await admin
    .from('outreach_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('provider', 'google')
    .eq('admin_user_id', auth.userId)
    .maybeSingle()

  if (!tokenRow?.refresh_token) {
    return { error: 'Gmail not connected. Click Connect Gmail first.', checked: 0, matched: 0 }
  }

  const { createOAuthClient, listRecentMessages, extractEmail } = await import('@/lib/outreach/gmail')
  const oauth = createOAuthClient()
  oauth.setCredentials({
    access_token: tokenRow.access_token ?? undefined,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : undefined,
  })

  // Load all sent pitches waiting for a reply
  const { data: pitches } = await admin
    .from('outreach_pitches')
    .select('id, sent_at, subject, outreach_editors (email)')
    .eq('status', 'sent')

  if (!pitches || pitches.length === 0) {
    return { error: null, checked: 0, matched: 0 }
  }

  const oldestSent = pitches.reduce((earliest: Date, p) => {
    const sentAt = p.sent_at ? new Date(p.sent_at) : new Date()
    return sentAt < earliest ? sentAt : earliest
  }, new Date())

  let messages
  try {
    messages = await listRecentMessages(oauth, oldestSent)
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Gmail API error',
      checked: 0,
      matched: 0,
    }
  }

  let matched = 0

  for (const p of pitches) {
    const editor = Array.isArray(p.outreach_editors) ? p.outreach_editors[0] : p.outreach_editors
    const editorEmail = editor?.email?.toLowerCase()
    if (!editorEmail || !p.sent_at) continue

    const sentAt = new Date(p.sent_at)
    const reply = messages.find((m) => {
      if (m.receivedAt <= sentAt) return false
      return extractEmail(m.from) === editorEmail
    })

    if (reply) {
      await admin
        .from('outreach_pitches')
        .update({
          status: 'replied',
          replied_at: reply.receivedAt.toISOString(),
          notes: reply.snippet.slice(0, 500),
        })
        .eq('id', p.id)
      matched++
    }
  }

  revalidatePath('/admin')
  return { error: null, checked: pitches.length, matched }
}

// ---------------------------------------------------------------------------
// refreshDomainMetrics — pull DR + organic traffic from Ahrefs for one domain
// ---------------------------------------------------------------------------
export async function refreshDomainMetrics(
  domainId: string
): Promise<{ error: string | null; dr?: number | null; monthlyTraffic?: number | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from('outreach_domains')
    .select('domain')
    .eq('id', domainId)
    .single()

  if (fetchErr || !row) return { error: 'Domain not found' }

  try {
    const { dr, monthlyTraffic } = await fetchDomainMetrics(row.domain)
    const { error: updateErr } = await admin
      .from('outreach_domains')
      .update({
        dr,
        monthly_traffic: monthlyTraffic,
        metrics_fetched_at: new Date().toISOString(),
      })
      .eq('id', domainId)
    if (updateErr) return { error: updateErr.message }

    revalidatePath('/admin')
    return { error: null, dr, monthlyTraffic }
  } catch (err) {
    const msg = err instanceof AhrefsApiError ? err.message : 'Ahrefs request failed'
    return { error: msg }
  }
}

// ---------------------------------------------------------------------------
// refreshAllDomainMetrics — batch-refresh DR + traffic for every domain.
// Serial with a small delay to stay polite to the Ahrefs API.
// ---------------------------------------------------------------------------
export async function refreshAllDomainMetrics(): Promise<{
  error: string | null
  updated: number
  failed: number
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, updated: 0, failed: 0 }

  const admin = createAdminClient()
  const { data: rows, error: fetchErr } = await admin
    .from('outreach_domains')
    .select('id, domain')

  if (fetchErr || !rows) return { error: fetchErr?.message ?? 'Load failed', updated: 0, failed: 0 }

  let updated = 0
  let failed = 0
  for (const row of rows) {
    try {
      const { dr, monthlyTraffic } = await fetchDomainMetrics(row.domain)
      await admin
        .from('outreach_domains')
        .update({
          dr,
          monthly_traffic: monthlyTraffic,
          metrics_fetched_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      updated++
    } catch (err) {
      console.error(`[refreshAllDomainMetrics] ${row.domain}:`, err)
      failed++
    }
    // Brief pause between requests
    await new Promise((r) => setTimeout(r, 250))
  }

  revalidatePath('/admin')
  return { error: null, updated, failed }
}

// ---------------------------------------------------------------------------
// rescoreEditor — recompute profile + combined score using all available
// enrichment (bio_text, ai_summary, linkedin_title) as well as Hunter data.
// Use after any enrichment action so a "Senior Motors Editor" whose Hunter
// title is null still picks up full credit from their bio or LinkedIn.
// ---------------------------------------------------------------------------
export async function rescoreEditor(
  editorId: string,
  adminClient?: ReturnType<typeof createAdminClient>
): Promise<{ error: string | null; profileScore?: number; combinedScore?: number }> {
  const admin = adminClient ?? createAdminClient()

  const { data: editor, error: loadErr } = await admin
    .from('outreach_editors')
    .select(`
      position, department, seniority, confidence,
      bio_text, ai_summary, linkedin_title,
      external_bio_text, twitter_bio,
      topical_score,
      outreach_domains ( priority_score )
    `)
    .eq('id', editorId)
    .single()

  if (loadErr || !editor) return { error: loadErr?.message ?? 'Editor not found' }

  const domain = Array.isArray(editor.outreach_domains)
    ? editor.outreach_domains[0]
    : editor.outreach_domains

  const enrichment = [
    editor.bio_text,
    editor.ai_summary,
    editor.linkedin_title,
    editor.external_bio_text,
    editor.twitter_bio,
  ]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join('\n')

  const profileScore = scoreEditorProfile({
    position: editor.position as string | null,
    seniority: editor.seniority as 'executive' | 'senior' | 'junior' | null,
    department: editor.department as string | null,
    confidence: editor.confidence as number | null,
    outletPriorityScore: typeof domain?.priority_score === 'number' ? domain.priority_score : 50,
    enrichmentText: enrichment || null,
  })

  const combined = computeCombinedScore(profileScore, editor.topical_score as number | null)

  const { error: updateErr } = await admin
    .from('outreach_editors')
    .update({ relevance_score: profileScore, combined_score: combined })
    .eq('id', editorId)

  if (updateErr) return { error: updateErr.message }
  return { error: null, profileScore, combinedScore: combined }
}

// ---------------------------------------------------------------------------
// fetchLinkedInProfile — scrape the editor's public LinkedIn headline via
// ScrapingBee and rescore. Costs ~10-25 ScrapingBee credits (premium proxy).
// ---------------------------------------------------------------------------
export async function fetchLinkedInProfile(
  editorId: string
): Promise<{ error: string | null; linkedinTitle?: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  const { data: editor, error: loadErr } = await admin
    .from('outreach_editors')
    .select('linkedin_url, first_name, last_name')
    .eq('id', editorId)
    .single()

  if (loadErr || !editor) return { error: 'Editor not found' }
  if (!editor.linkedin_url) return { error: 'No LinkedIn URL on file for this editor' }

  const sbOk = await canUseQuota(admin, 'scrapingbee')
  if (!sbOk) {
    const { used, limit } = await getUsage(admin, 'scrapingbee')
    return { error: `ScrapingBee monthly quota reached (${used}/${limit})` }
  }

  let title: string | null = null
  try {
    title = await scrapeLinkedInTitle(editor.linkedin_url, editor.first_name, editor.last_name)
    await incrementUsage(admin, 'scrapingbee')
  } catch (err) {
    const msg = err instanceof LinkedInScrapeError
      ? err.message
      : err instanceof Error ? err.message : 'LinkedIn scrape failed'
    return { error: msg }
  }

  await admin
    .from('outreach_editors')
    .update({
      linkedin_title: title,
      linkedin_scraped_at: new Date().toISOString(),
    })
    .eq('id', editorId)

  await rescoreEditor(editorId, admin)
  revalidatePath('/admin')
  return { error: null, linkedinTitle: title }
}

// ---------------------------------------------------------------------------
// rescoreAllEditors — batch re-score every editor. Useful after scoring
// rules change or mass enrichment.
// ---------------------------------------------------------------------------
export async function rescoreAllEditors(): Promise<{ error: string | null; updated: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, updated: 0 }
  const admin = createAdminClient()
  const { data: rows } = await admin.from('outreach_editors').select('id')
  if (!rows) return { error: null, updated: 0 }
  let updated = 0
  for (const r of rows) {
    const res = await rescoreEditor(r.id, admin)
    if (!res.error) updated++
  }
  revalidatePath('/admin')
  return { error: null, updated }
}

// ---------------------------------------------------------------------------
// updateDomainPriorityScore — inline edit the 0-100 priority_score
// ---------------------------------------------------------------------------
export async function updateDomainPriorityScore(
  domainId: string,
  score: number
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { error: 'Priority score must be between 0 and 100' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('outreach_domains')
    .update({ priority_score: Math.round(score) })
    .eq('id', domainId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}
