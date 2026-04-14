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
import { classifyEditor, type Beat } from '@/lib/outreach/beats'
import { findEmail } from '@/lib/outreach/email-finder'
import {
  fetchOutletIndex,
  extractBylinesFromHtml,
  isQuiet,
  type ByLineCandidate,
} from '@/lib/outreach/movement'
import { fetchByline } from '@/lib/outreach/byline-archive'
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

  // 5) Classify beats + extract pitch preferences via Claude (one call each).
  //    Beats are descriptive/filterable; do NOT modify scoring columns.
  try {
    await enrichEditorProfile(editorId, admin)
  } catch (err) {
    console.error(`[fullyEnrichEditor:beats] ${emailForLogs}:`, err instanceof Error ? err.message : err)
  }

  // 6) Final rescore so everything we just gathered is reflected in combined_score
  try {
    await rescoreEditor(editorId, admin)
  } catch (err) {
    console.error(`[fullyEnrichEditor:rescore] ${emailForLogs}:`, err instanceof Error ? err.message : err)
  }
}

export async function discoverEditors(
  domainId: string
): Promise<{ error: string | null; inserted: number; skipped: number; enriched?: number; durationMs?: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, inserted: 0, skipped: 0 }

  const startedAt = Date.now()
  const startedAtIso = new Date(startedAt).toISOString()
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

  // PHASE 1 — insert every editor Hunter returned that passes the scoring
  // gate. This phase is fast (no external API calls) so we can handle
  // domains with 50+ editors within the 300s serverless budget.
  const outletPriority = typeof domain.priority_score === 'number' ? domain.priority_score : 50
  type PendingEnrich = {
    id: string
    firstName: string | null
    lastName: string | null
    linkedinUrl: string | null
    twitterHandle: string | null
    emailForLogs: string
    initialScore: number
  }
  const toEnrich: PendingEnrich[] = []
  let inserted = 0
  let skipped = 0

  for (const email of hunterData.data.emails) {
    const profileScore = scoreEditorProfile({
      position: email.position,
      seniority: email.seniority,
      department: email.department,
      confidence: email.confidence,
      outletPriorityScore: outletPriority,
    })

    // Hard-zeroed editors (non-editorial / sales / HR) never make it in
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
      continue
    }

    inserted++
    if (insertedRow?.id) {
      toEnrich.push({
        id: insertedRow.id,
        firstName: email.first_name,
        lastName: email.last_name,
        linkedinUrl: email.linkedin,
        twitterHandle: email.twitter,
        emailForLogs: email.value,
        initialScore: profileScore,
      })
    }
  }

  // PHASE 2 — run full enrichment (Serper + ScrapingBee + OpenAI + LinkedIn)
  // for only the top-N editors by initial match score. Others remain in the
  // list with Hunter-only scoring; users can click into any editor's detail
  // panel to run the full enrichment on demand. This keeps Discover within
  // the 300s Vercel budget even for outlets with 50+ emails.
  const ENRICH_TOP_N = 15
  const topToEnrich = [...toEnrich]
    .sort((a, b) => b.initialScore - a.initialScore)
    .slice(0, ENRICH_TOP_N)

  for (const p of topToEnrich) {
    await fullyEnrichEditor(
      admin,
      p.id,
      p.firstName,
      p.lastName,
      p.linkedinUrl,
      p.twitterHandle,
      domain.domain,
      p.emailForLogs
    )
  }

  // Mark the domain as searched + persist the summary + wall-clock duration.
  const enriched = topToEnrich.length
  const durationMs = Date.now() - startedAt
  const ranAt = new Date().toISOString()
  await admin
    .from('outreach_domains')
    .update({
      hunter_searched_at: ranAt,
      last_discover_result: { inserted, skipped, enriched, ran_at: ranAt, duration_ms: durationMs },
    })
    .eq('id', domain.id)

  // Log to outreach_job_runs so we can compute historical averages per outlet.
  await admin.from('outreach_job_runs').insert({
    job_name: 'discover',
    started_at: startedAtIso,
    finished_at: ranAt,
    items_processed: inserted,
    errors_count: 0,
    summary: {
      domain_id: domain.id,
      domain: domain.domain,
      inserted, skipped, enriched,
      duration_ms: durationMs,
    },
  })

  revalidatePath('/admin')
  return { error: null, inserted, skipped, enriched, durationMs }
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

/**
 * Shared reply-matching routine used by both the user-triggered action
 * (checkForReplies) and the hourly cron (pollRepliesForAllAdmins).
 * Requires a valid Gmail token and walks outreach_pitches marking replies.
 */
async function runReplyMatch(
  admin: ReturnType<typeof createAdminClient>,
  tokenRow: { access_token: string | null; refresh_token: string; expires_at: string | null }
): Promise<{ error: string | null; checked: number; matched: number }> {
  const { createOAuthClient, listRecentMessages, extractEmail } = await import('@/lib/outreach/gmail')
  const oauth = createOAuthClient()
  oauth.setCredentials({
    access_token: tokenRow.access_token ?? undefined,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : undefined,
  })

  const { data: pitches } = await admin
    .from('outreach_pitches')
    .select('id, sent_at, subject, outreach_editors (email)')
    .eq('status', 'sent')

  if (!pitches || pitches.length === 0) {
    return { error: null, checked: 0, matched: 0 }
  }

  const oldestSent = pitches.reduce((earliest: Date, p) => {
    const sentAt = p.sent_at ? new Date(p.sent_at as string) : new Date()
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
    const editorEmail = (editor as { email: string } | null)?.email?.toLowerCase()
    if (!editorEmail || !p.sent_at) continue

    const sentAt = new Date(p.sent_at as string)
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
        .eq('id', p.id as string)
      matched++
    }
  }

  return { error: null, checked: pitches.length, matched }
}

/**
 * Cron-safe: checks replies using any admin's stored Gmail token.
 * Iterates all tokens so reply-detection still works if multiple admins
 * have connected Gmail.
 */
export async function pollRepliesForAllAdmins(): Promise<{
  error: string | null
  checked: number
  matched: number
}> {
  const admin = createAdminClient()
  const { data: tokens } = await admin
    .from('outreach_oauth_tokens')
    .select('access_token, refresh_token, expires_at, admin_user_id')
    .eq('provider', 'google')

  if (!tokens || tokens.length === 0) {
    return { error: null, checked: 0, matched: 0 }
  }

  let totalChecked = 0
  let totalMatched = 0
  for (const t of tokens) {
    if (!t.refresh_token) continue
    const res = await runReplyMatch(admin, {
      access_token: t.access_token as string | null,
      refresh_token: t.refresh_token as string,
      expires_at: t.expires_at as string | null,
    })
    if (res.error) {
      console.error(`[pollRepliesForAllAdmins] token ${t.admin_user_id}:`, res.error)
      continue
    }
    totalChecked += res.checked
    totalMatched += res.matched
  }

  revalidatePath('/admin')
  return { error: null, checked: totalChecked, matched: totalMatched }
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

  const res = await runReplyMatch(admin, {
    access_token: tokenRow.access_token as string | null,
    refresh_token: tokenRow.refresh_token as string,
    expires_at: tokenRow.expires_at as string | null,
  })
  revalidatePath('/admin')
  return res
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
// recalculateAllArticleScores — re-run analyzeArticleTitle on every stored
// article with the current scoring rules, persist the new topic_match_score
// per article, recompute each editor's topical_score, and rescore all
// editors. Use after changing the scoring formula so existing data catches up.
// ---------------------------------------------------------------------------
export async function recalculateAllArticleScores(): Promise<{
  error: string | null
  articles: number
  editors: number
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, articles: 0, editors: 0 }
  const admin = createAdminClient()

  const { data: articles } = await admin
    .from('outreach_articles')
    .select('id, editor_id, title, snippet')
  if (!articles) return { error: null, articles: 0, editors: 0 }

  // Re-score each article with the current analyzeArticleTitle logic
  let articlesUpdated = 0
  const editorIds = new Set<string>()
  for (const a of articles) {
    const { score, matchedKeywords } = analyzeArticleTitle({
      title: a.title,
      snippet: a.snippet,
    })
    const { error } = await admin
      .from('outreach_articles')
      .update({ topic_match_score: score, topic_keywords: matchedKeywords })
      .eq('id', a.id)
    if (!error) {
      articlesUpdated++
      editorIds.add(a.editor_id)
    }
  }

  // Recompute topical_score per affected editor, then rescore
  let editorsUpdated = 0
  for (const editorId of editorIds) {
    const { data: rows } = await admin
      .from('outreach_articles')
      .select('topic_match_score')
      .eq('editor_id', editorId)
    const scores = (rows ?? []).map((r) => r.topic_match_score ?? 0)
    const topical = scoreEditorTopical(scores)
    await admin
      .from('outreach_editors')
      .update({ topical_score: topical })
      .eq('id', editorId)
    const res = await rescoreEditor(editorId, admin)
    if (!res.error) editorsUpdated++
  }

  revalidatePath('/admin')
  return { error: null, articles: articlesUpdated, editors: editorsUpdated }
}

// ---------------------------------------------------------------------------
// rescoreAllEditors — batch re-score every editor. Useful after scoring
// rules change or mass enrichment.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// enrichEditorProfile — classify beats + pitch preferences via Claude.
// Runs after all text-enrichment steps (bio/linkedin/twitter/ai-summary) so
// it has the most context. Persists beats, beat_summary, pitch_preferences.
// ---------------------------------------------------------------------------
export async function enrichEditorProfile(
  editorId: string,
  adminClient?: ReturnType<typeof createAdminClient>
): Promise<{ error: string | null; beats?: Beat[] }> {
  const admin = adminClient ?? createAdminClient()

  const { data: editor, error: loadErr } = await admin
    .from('outreach_editors')
    .select(`
      id, first_name, last_name, position,
      bio_text, external_bio_text, linkedin_title, twitter_bio, ai_summary,
      outreach_domains ( outlet_name )
    `)
    .eq('id', editorId)
    .single()

  if (loadErr || !editor) return { error: loadErr?.message ?? 'Editor not found' }

  const domain = Array.isArray(editor.outreach_domains)
    ? editor.outreach_domains[0]
    : editor.outreach_domains

  const { data: articles } = await admin
    .from('outreach_articles')
    .select('title')
    .eq('editor_id', editorId)
    .order('topic_match_score', { ascending: false })
    .limit(12)

  const articleTitles = (articles ?? [])
    .map((a) => a.title as string | null)
    .filter((t): t is string => typeof t === 'string' && t.length > 0)

  const name = [editor.first_name, editor.last_name].filter(Boolean).join(' ') || 'Unknown editor'

  const { result, error } = await classifyEditor({
    editorName: name,
    outletName: domain?.outlet_name ?? 'unknown outlet',
    position: editor.position as string | null,
    bioText: editor.bio_text as string | null,
    externalBioText: editor.external_bio_text as string | null,
    linkedinTitle: editor.linkedin_title as string | null,
    twitterBio: editor.twitter_bio as string | null,
    aiSummary: editor.ai_summary as string | null,
    articleTitles,
  })

  if (error || !result) return { error: error ?? 'Classifier returned no result' }

  const now = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('outreach_editors')
    .update({
      beats: result.beats,
      beat_summary: result.beatSummary || null,
      beats_classified_at: now,
      pitch_preferences: result.pitchPreferences,
      preferences_scraped_at: now,
    })
    .eq('id', editorId)

  if (updateErr) return { error: updateErr.message }
  return { error: null, beats: result.beats }
}

// ---------------------------------------------------------------------------
// classifyEditorBeatsAction — admin-gated wrapper around enrichEditorProfile
// used as the "Classify beats" button handler.
// ---------------------------------------------------------------------------
export async function classifyEditorBeatsAction(
  editorId: string
): Promise<{ error: string | null; beats?: Beat[] }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  return enrichEditorProfile(editorId)
}

// ---------------------------------------------------------------------------
// classifyBeatsBulk — batch-run beat classification for a list of editor IDs
// (used from the bulk action bar).
// ---------------------------------------------------------------------------
export async function classifyBeatsBulk(
  editorIds: string[]
): Promise<{ error: string | null; updated: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, updated: 0 }
  const admin = createAdminClient()
  let updated = 0
  for (const id of editorIds) {
    const res = await enrichEditorProfile(id, admin)
    if (!res.error) updated++
  }
  revalidatePath('/admin')
  return { error: null, updated }
}

// ---------------------------------------------------------------------------
// getPitchFollowUps — pitches that need a nudge or are going dormant.
// Purely derived from outreach_pitches; no new table.
// ---------------------------------------------------------------------------
export interface PitchFollowUp {
  pitchId: string
  editorId: string
  editorName: string
  outletName: string
  subject: string
  sentAt: string
  daysSinceSent: number
  bucket: 'due_soon' | 'dormant'
}

export async function getPitchFollowUps(): Promise<{
  error: string | null
  items: PitchFollowUp[]
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, items: [] }
  const admin = createAdminClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('outreach_pitches')
    .select(`
      id, subject, sent_at, editor_id,
      outreach_editors (
        first_name, last_name,
        outreach_domains ( outlet_name )
      )
    `)
    .eq('status', 'sent')
    .is('replied_at', null)
    .lt('sent_at', sevenDaysAgo)
    .order('sent_at', { ascending: true })

  if (error) return { error: error.message, items: [] }

  const items: PitchFollowUp[] = (data ?? []).map((row) => {
    const editor = Array.isArray(row.outreach_editors)
      ? row.outreach_editors[0]
      : row.outreach_editors
    const domain = editor
      ? (Array.isArray(editor.outreach_domains) ? editor.outreach_domains[0] : editor.outreach_domains)
      : null
    const name = editor
      ? [editor.first_name, editor.last_name].filter(Boolean).join(' ') || '—'
      : '—'
    const sent = new Date(row.sent_at as string)
    const days = Math.floor((Date.now() - sent.getTime()) / (24 * 60 * 60 * 1000))
    return {
      pitchId: row.id as string,
      editorId: row.editor_id as string,
      editorName: name,
      outletName: domain?.outlet_name ?? '—',
      subject: row.subject as string,
      sentAt: row.sent_at as string,
      daysSinceSent: days,
      bucket: days >= 21 ? 'dormant' : 'due_soon',
    }
  })

  return { error: null, items }
}

// ---------------------------------------------------------------------------
// markPitchDormant — user manually gives up on a pitch (status='rejected')
// ---------------------------------------------------------------------------
export async function markPitchDormant(pitchId: string): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin
    .from('outreach_pitches')
    .update({ status: 'rejected' })
    .eq('id', pitchId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

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
// deleteEditors — remove one or more editors (articles/pitches cascade via FK)
// ---------------------------------------------------------------------------
export async function deleteEditors(
  editorIds: string[]
): Promise<{ error: string | null; deleted: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, deleted: 0 }
  if (editorIds.length === 0) return { error: null, deleted: 0 }

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('outreach_editors')
    .delete({ count: 'exact' })
    .in('id', editorIds)

  if (error) return { error: error.message, deleted: 0 }
  revalidatePath('/admin')
  return { error: null, deleted: count ?? 0 }
}

// ---------------------------------------------------------------------------
// setEditorsContacted — bulk toggle contacted_at (null = not contacted,
// now = contacted)
// ---------------------------------------------------------------------------
export async function setEditorsContacted(
  editorIds: string[],
  contacted: boolean
): Promise<{ error: string | null; updated: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, updated: 0 }
  if (editorIds.length === 0) return { error: null, updated: 0 }

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('outreach_editors')
    .update({ contacted_at: contacted ? new Date().toISOString() : null }, { count: 'exact' })
    .in('id', editorIds)

  if (error) return { error: error.message, updated: 0 }
  revalidatePath('/admin')
  return { error: null, updated: count ?? 0 }
}

// ---------------------------------------------------------------------------
// rescoreEditors — bulk rescore a subset (used by the Editor list bulk bar)
// ---------------------------------------------------------------------------
export async function rescoreEditors(
  editorIds: string[]
): Promise<{ error: string | null; updated: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, updated: 0 }
  const admin = createAdminClient()
  let updated = 0
  for (const id of editorIds) {
    const res = await rescoreEditor(id, admin)
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

// ===========================================================================
// Phase B — Cron orchestrators + settings CRUD
// ===========================================================================

async function logJobRun(
  admin: ReturnType<typeof createAdminClient>,
  jobName: string,
  startedAt: string,
  itemsProcessed: number,
  errorsCount: number,
  summary: Record<string, unknown>
) {
  await admin.from('outreach_job_runs').insert({
    job_name: jobName,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    items_processed: itemsProcessed,
    errors_count: errorsCount,
    summary,
  })
}

// ---------------------------------------------------------------------------
// Competitor brand + monitor keyword CRUD (admin-gated)
// ---------------------------------------------------------------------------
export async function listCompetitorBrands(): Promise<{
  error: string | null
  items: { id: string; name: string; aliases: string[]; notes: string | null; active: boolean }[]
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, items: [] }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_competitor_brands')
    .select('id, name, aliases, notes, active')
    .order('created_at', { ascending: false })
  if (error) return { error: error.message, items: [] }
  return { error: null, items: (data ?? []) as {
    id: string; name: string; aliases: string[]; notes: string | null; active: boolean
  }[] }
}

export async function createCompetitorBrand(
  name: string,
  aliasesCsv: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name required' }
  const aliases = aliasesCsv.split(',').map((s) => s.trim()).filter(Boolean)
  const admin = createAdminClient()
  const { error } = await admin.from('outreach_competitor_brands').insert({
    name: trimmed, aliases, active: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function toggleCompetitorBrand(id: string, active: boolean): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.from('outreach_competitor_brands').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function deleteCompetitorBrand(id: string): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.from('outreach_competitor_brands').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function listMonitorKeywords(): Promise<{
  error: string | null
  items: { id: string; keyword: string; notes: string | null; active: boolean }[]
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, items: [] }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_monitor_keywords')
    .select('id, keyword, notes, active')
    .order('created_at', { ascending: false })
  if (error) return { error: error.message, items: [] }
  return { error: null, items: (data ?? []) as {
    id: string; keyword: string; notes: string | null; active: boolean
  }[] }
}

export async function createMonitorKeyword(keyword: string): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  const trimmed = keyword.trim()
  if (!trimmed) return { error: 'Keyword required' }
  const admin = createAdminClient()
  const { error } = await admin.from('outreach_monitor_keywords').insert({ keyword: trimmed, active: true })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function toggleMonitorKeyword(id: string, active: boolean): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.from('outreach_monitor_keywords').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function deleteMonitorKeyword(id: string): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.from('outreach_monitor_keywords').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

// ---------------------------------------------------------------------------
// runMovementScan — weekly. Fetch outlet index, parse bylines, diff.
// ---------------------------------------------------------------------------
export async function runMovementScan(): Promise<{
  error: string | null
  domainsScanned: number
  newEditors: number
  wentQuiet: number
  returned: number
}> {
  const startedAt = new Date().toISOString()
  const admin = createAdminClient()

  const { data: domains } = await admin
    .from('outreach_domains')
    .select('id, domain, priority_score')
    .order('priority_score', { ascending: false, nullsFirst: false })

  let newEditors = 0
  let wentQuiet = 0
  let returned = 0
  let errors = 0

  for (const d of domains ?? []) {
    try {
      const fetched = await fetchOutletIndex(d.domain as string)
      if (!fetched) continue
      const bylines = extractBylinesFromHtml(fetched.html, fetched.url)
      const now = new Date().toISOString()

      const { data: existing } = await admin
        .from('outreach_editors')
        .select('id, first_name, last_name, last_seen_at, went_quiet_at')
        .eq('domain_id', d.id as string)

      const existingMap = new Map<string, {
        id: string; last_seen_at: string | null; went_quiet_at: string | null
      }>()
      for (const e of existing ?? []) {
        const key = `${(e.first_name as string | null)?.toLowerCase() ?? ''} ${(e.last_name as string | null)?.toLowerCase() ?? ''}`.trim()
        if (key) existingMap.set(key, {
          id: e.id as string,
          last_seen_at: e.last_seen_at as string | null,
          went_quiet_at: e.went_quiet_at as string | null,
        })
      }

      const seenKeys = new Set<string>()

      for (const b of bylines) {
        const key = `${b.firstName.toLowerCase()} ${b.lastName.toLowerCase()}`
        seenKeys.add(key)
        const match = existingMap.get(key)

        if (match) {
          const update: Record<string, unknown> = { last_seen_at: now }
          if (match.went_quiet_at) {
            update.went_quiet_at = null
            returned++
            await admin.from('outreach_editor_movements').insert({
              editor_id: match.id,
              domain_id: d.id as string,
              event_type: 'returned',
              source_url: b.sourceUrl,
            })
          }
          await admin.from('outreach_editors').update(update).eq('id', match.id)
        } else {
          const enrichedOk = await enrichNewByline(admin, d.id as string, d.domain as string, b)
          if (enrichedOk) {
            newEditors++
            await admin.from('outreach_editor_movements').insert({
              domain_id: d.id as string,
              event_type: 'new',
              source_url: b.sourceUrl,
              details: { first_name: b.firstName, last_name: b.lastName },
            })
          }
        }
      }

      for (const [key, existingEditor] of existingMap) {
        if (seenKeys.has(key)) continue
        const lastSeen = existingEditor.last_seen_at ? new Date(existingEditor.last_seen_at) : null
        if (!existingEditor.went_quiet_at && lastSeen && isQuiet(lastSeen)) {
          await admin
            .from('outreach_editors')
            .update({ went_quiet_at: now })
            .eq('id', existingEditor.id)
          await admin.from('outreach_editor_movements').insert({
            editor_id: existingEditor.id,
            domain_id: d.id as string,
            event_type: 'went_quiet',
          })
          wentQuiet++
        }
      }
    } catch (err) {
      errors++
      console.error(`[runMovementScan] ${d.domain}:`, err instanceof Error ? err.message : err)
    }
  }

  await logJobRun(admin, 'movement-scan', startedAt, domains?.length ?? 0, errors, {
    newEditors, wentQuiet, returned,
  })

  revalidatePath('/admin')
  return { error: null, domainsScanned: domains?.length ?? 0, newEditors, wentQuiet, returned }
}

async function enrichNewByline(
  admin: ReturnType<typeof createAdminClient>,
  domainId: string,
  domain: string,
  byline: ByLineCandidate
): Promise<boolean> {
  if (!(await canUseQuota(admin, 'hunter'))) return false

  let finder
  try {
    finder = await findEmail(domain, byline.firstName, byline.lastName)
    await incrementUsage(admin, 'hunter')
  } catch (err) {
    console.error(`[enrichNewByline] email-finder ${byline.firstName} ${byline.lastName}:`, err instanceof Error ? err.message : err)
    return false
  }

  if (!finder.email) return false

  const { data: inserted, error: insErr } = await admin
    .from('outreach_editors')
    .insert({
      domain_id: domainId,
      email: finder.email,
      first_name: byline.firstName,
      last_name: byline.lastName,
      position: finder.position,
      linkedin_url: finder.linkedin_url,
      twitter_handle: finder.twitter_handle,
      confidence: finder.score,
      last_seen_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insErr || !inserted) return false

  await fullyEnrichEditor(
    admin,
    inserted.id as string,
    byline.firstName,
    byline.lastName,
    finder.linkedin_url,
    finder.twitter_handle,
    domain,
    finder.email
  )
  return true
}

// ---------------------------------------------------------------------------
// runCompetitorScan — weekly.
// ---------------------------------------------------------------------------
export async function runCompetitorScan(): Promise<{
  error: string | null
  hits: number
}> {
  const startedAt = new Date().toISOString()
  const admin = createAdminClient()

  const [{ data: brands }, { data: domains }] = await Promise.all([
    admin.from('outreach_competitor_brands').select('id, name, aliases').eq('active', true),
    admin.from('outreach_domains').select('id, domain'),
  ])

  if (!brands?.length || !domains?.length) {
    await logJobRun(admin, 'competitor-scan', startedAt, 0, 0, { skipped: 'no brands or domains' })
    return { error: null, hits: 0 }
  }

  let hits = 0
  let errors = 0

  for (const brand of brands) {
    const aliases = (brand.aliases as string[] | null) ?? []
    const phrases = [brand.name as string, ...aliases].filter(Boolean)
    const queryBrand = phrases.map((p) => `"${p}"`).join(' OR ')

    for (const d of domains) {
      if (!(await canUseQuota(admin, 'serper'))) break
      try {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': process.env.SERPER_API_KEY!, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `${queryBrand} site:${d.domain}`, num: 5 }),
        })
        await incrementUsage(admin, 'serper')
        if (!res.ok) continue
        const data = await res.json()
        const results = (data.organic ?? []) as Array<{ link: string; title: string; snippet?: string }>
        for (const r of results) {
          const { data: existing } = await admin
            .from('outreach_editor_movements')
            .select('id')
            .eq('source_url', r.link)
            .eq('domain_id', d.id as string)
            .maybeSingle()
          if (existing) continue
          await admin.from('outreach_editor_movements').insert({
            domain_id: d.id as string,
            event_type: 'new',
            source_url: r.link,
            details: { kind: 'competitor_coverage', brand_id: brand.id, brand: brand.name, title: r.title, snippet: r.snippet ?? null },
          })
          hits++
        }
      } catch (err) {
        errors++
        console.error(`[runCompetitorScan] ${brand.name} / ${d.domain}:`, err instanceof Error ? err.message : err)
      }
    }
  }

  await logJobRun(admin, 'competitor-scan', startedAt, brands.length * domains.length, errors, { hits })
  revalidatePath('/admin')
  return { error: null, hits }
}

// ---------------------------------------------------------------------------
// runMediaMonitor — daily.
// ---------------------------------------------------------------------------
export async function runMediaMonitor(): Promise<{ error: string | null; hits: number }> {
  const startedAt = new Date().toISOString()
  const admin = createAdminClient()

  const [{ data: keywords }, { data: domains }] = await Promise.all([
    admin.from('outreach_monitor_keywords').select('id, keyword').eq('active', true),
    admin.from('outreach_domains').select('id, domain'),
  ])

  if (!keywords?.length || !domains?.length) {
    await logJobRun(admin, 'media-monitor', startedAt, 0, 0, { skipped: 'no keywords or domains' })
    return { error: null, hits: 0 }
  }

  let hits = 0
  let errors = 0

  for (const k of keywords) {
    for (const d of domains) {
      if (!(await canUseQuota(admin, 'serper'))) break
      try {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': process.env.SERPER_API_KEY!, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `"${k.keyword}" site:${d.domain}`, num: 5, tbs: 'qdr:m' }),
        })
        await incrementUsage(admin, 'serper')
        if (!res.ok) continue
        const data = await res.json()
        const results = (data.organic ?? []) as Array<{ link: string; title: string; snippet?: string; date?: string }>
        for (const r of results) {
          const { data: existing } = await admin
            .from('outreach_editor_movements')
            .select('id')
            .eq('source_url', r.link)
            .eq('domain_id', d.id as string)
            .maybeSingle()
          if (existing) continue
          await admin.from('outreach_editor_movements').insert({
            domain_id: d.id as string,
            event_type: 'new',
            source_url: r.link,
            details: { kind: 'media_match', keyword_id: k.id, keyword: k.keyword, title: r.title, snippet: r.snippet ?? null, date: r.date ?? null },
          })
          hits++
        }
      } catch (err) {
        errors++
        console.error(`[runMediaMonitor] ${k.keyword} / ${d.domain}:`, err instanceof Error ? err.message : err)
      }
    }
  }

  await logJobRun(admin, 'media-monitor', startedAt, keywords.length * domains.length, errors, { hits })
  revalidatePath('/admin')
  return { error: null, hits }
}

// ---------------------------------------------------------------------------
// UI reader helpers
// ---------------------------------------------------------------------------
export interface MovementRow {
  id: string
  editor_id: string | null
  domain_id: string
  event_type: string
  detected_at: string
  source_url: string | null
  details: Record<string, unknown> | null
  outlet_name: string
  editor_name: string | null
}

export async function getRecentMovements(days = 14): Promise<{ error: string | null; items: MovementRow[] }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, items: [] }
  const admin = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('outreach_editor_movements')
    .select(`
      id, editor_id, domain_id, event_type, detected_at, source_url, details,
      outreach_domains (outlet_name),
      outreach_editors (first_name, last_name)
    `)
    .gte('detected_at', since)
    .order('detected_at', { ascending: false })
    .limit(100)
  if (error) return { error: error.message, items: [] }
  const items: MovementRow[] = (data ?? []).map((m) => {
    const d = Array.isArray(m.outreach_domains) ? m.outreach_domains[0] : m.outreach_domains
    const e = Array.isArray(m.outreach_editors) ? m.outreach_editors[0] : m.outreach_editors
    return {
      id: m.id as string,
      editor_id: m.editor_id as string | null,
      domain_id: m.domain_id as string,
      event_type: m.event_type as string,
      detected_at: m.detected_at as string,
      source_url: m.source_url as string | null,
      details: m.details as Record<string, unknown> | null,
      outlet_name: (d as { outlet_name: string } | null)?.outlet_name ?? '—',
      editor_name: e
        ? [(e as { first_name: string | null }).first_name, (e as { last_name: string | null }).last_name]
          .filter(Boolean).join(' ') || null
        : null,
    }
  })
  return { error: null, items }
}

// ---------------------------------------------------------------------------
// fetchEditorFullArchive — crawl the outlet author page for ALL articles.
// On-demand button in EditorDetail. Dedupes via UNIQUE(editor_id, url).
// ---------------------------------------------------------------------------
export async function fetchEditorFullArchive(
  editorId: string
): Promise<{ error: string | null; inserted: number }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, inserted: 0 }
  const admin = createAdminClient()

  const { data: editor } = await admin
    .from('outreach_editors')
    .select('first_name, last_name, outreach_domains (domain)')
    .eq('id', editorId)
    .single()
  if (!editor || !editor.first_name || !editor.last_name) {
    return { error: 'Editor not found or missing name', inserted: 0 }
  }
  const domainRow = Array.isArray(editor.outreach_domains)
    ? editor.outreach_domains[0]
    : editor.outreach_domains
  if (!domainRow?.domain) return { error: 'Editor has no domain', inserted: 0 }

  if (!(await canUseQuota(admin, 'scrapingbee'))) {
    return { error: 'ScrapingBee quota exhausted', inserted: 0 }
  }

  let articles
  try {
    articles = await fetchByline(
      domainRow.domain as string,
      editor.first_name as string,
      editor.last_name as string
    )
    await incrementUsage(admin, 'scrapingbee')
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Archive fetch failed',
      inserted: 0,
    }
  }

  let inserted = 0
  const articleScores: number[] = []
  for (const a of articles) {
    const { score, matchedKeywords } = analyzeArticleTitle({ title: a.title, snippet: a.snippet })
    articleScores.push(score)
    const { error: insErr } = await admin.from('outreach_articles').insert({
      editor_id: editorId,
      url: a.url,
      title: a.title,
      snippet: a.snippet,
      published_date: a.publishedDate,
      topic_match_score: score,
      topic_keywords: matchedKeywords,
    })
    if (!insErr) inserted++
  }

  // Recompute topical over all articles (not just the newly inserted)
  const { data: allArticles } = await admin
    .from('outreach_articles')
    .select('topic_match_score')
    .eq('editor_id', editorId)
  const topical = scoreEditorTopical(
    (allArticles ?? []).map((a) => a.topic_match_score ?? 0)
  )
  await admin
    .from('outreach_editors')
    .update({ topical_score: topical, articles_fetched_at: new Date().toISOString() })
    .eq('id', editorId)
  await rescoreEditor(editorId, admin)

  revalidatePath('/admin')
  return { error: null, inserted }
}

// ---------------------------------------------------------------------------
// getDiscoverTimingStats — aggregate runtimes across all recorded discover
// runs so the UI can show "avg 142s over 18 runs".
// ---------------------------------------------------------------------------
export async function getDiscoverTimingStats(): Promise<{
  error: string | null
  runs: number
  avgMs: number | null
  medianMs: number | null
  minMs: number | null
  maxMs: number | null
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, runs: 0, avgMs: null, medianMs: null, minMs: null, maxMs: null }
  const admin = createAdminClient()
  const { data } = await admin
    .from('outreach_job_runs')
    .select('summary')
    .eq('job_name', 'discover')
    .order('started_at', { ascending: false })
    .limit(500)
  const durations = (data ?? [])
    .map((r) => {
      const s = r.summary as { duration_ms?: number } | null
      return s && typeof s.duration_ms === 'number' ? s.duration_ms : null
    })
    .filter((n): n is number => n !== null)
  if (durations.length === 0) {
    return { error: null, runs: 0, avgMs: null, medianMs: null, minMs: null, maxMs: null }
  }
  const sorted = [...durations].sort((a, b) => a - b)
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  const median = sorted[Math.floor(sorted.length / 2)]
  return {
    error: null,
    runs: durations.length,
    avgMs: avg,
    medianMs: median,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
  }
}

export async function getRecentJobRuns(limit = 10): Promise<{
  error: string | null
  items: { id: string; job_name: string; started_at: string; finished_at: string | null; items_processed: number; errors_count: number; summary: Record<string, unknown> | null }[]
}> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error, items: [] }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('outreach_job_runs')
    .select('id, job_name, started_at, finished_at, items_processed, errors_count, summary')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) return { error: error.message, items: [] }
  return { error: null, items: (data ?? []) as {
    id: string; job_name: string; started_at: string; finished_at: string | null;
    items_processed: number; errors_count: number; summary: Record<string, unknown> | null
  }[] }
}
