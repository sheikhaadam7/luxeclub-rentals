import { createAdminClient } from '@/lib/supabase/admin'
import { getUsage } from '@/lib/outreach/quota'
import { OutreachEmptyState } from './outreach/OutreachEmptyState'
import { DomainsList } from './outreach/DomainsList'
import { EditorsList, type EditorRow } from './outreach/EditorsList'
import { QuotaIndicator } from './outreach/QuotaIndicator'
import { AnchorTracker } from './outreach/AnchorTracker'
import { FollowUpsPanel } from './outreach/FollowUpsPanel'
import { OutreachSettings } from './outreach/OutreachSettings'
import { MovementsPanel } from './outreach/MovementsPanel'
import { CompetitorAndMediaPanels } from './outreach/CompetitorAndMediaPanels'
import { PitchHistory, type PitchRow } from './outreach/PitchHistory'
import { GmailConnect } from './outreach/GmailConnect'
import { getGmailConnection } from '@/app/actions/outreach'

export async function OutreachTab() {
  const admin = createAdminClient()

  // Fetch domains sorted by priority_score (highest first)
  const { data: domains, error: domainsError } = await admin
    .from('outreach_domains')
    .select('*')
    .order('priority_score', { ascending: false, nullsFirst: false })
    .order('tier', { ascending: true })
    .order('outlet_name', { ascending: true })

  if (domainsError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded">
        Failed to load outreach domains: {domainsError.message}
      </div>
    )
  }

  if (!domains || domains.length === 0) {
    return <OutreachEmptyState />
  }

  // Fetch editors joined with their outlets
  const { data: editorsRaw } = await admin
    .from('outreach_editors')
    .select(`
      id, domain_id, email, first_name, last_name, position, seniority, department,
      linkedin_url, twitter_handle, confidence, relevance_score, topical_score, combined_score,
      articles_fetched_at, contacted_at, bio_fetched_at, bio_text, bio_url, ai_summary,
      linkedin_title, linkedin_scraped_at,
      external_bio_text, external_bio_url, external_bio_source, external_fetched_at,
      twitter_bio,
      beats, beat_summary, beats_classified_at,
      pitch_preferences, preferences_scraped_at,
      last_seen_at, went_quiet_at,
      skipped, skip_reason,
      outreach_domains (outlet_name, domain, tier, priority, dr)
    `)
    .order('combined_score', { ascending: false, nullsFirst: false })

  const editors: EditorRow[] = (editorsRaw ?? []).map((e: {
    id: string
    domain_id: string
    email: string
    first_name: string | null
    last_name: string | null
    position: string | null
    seniority: string | null
    department: string | null
    linkedin_url: string | null
    twitter_handle: string | null
    confidence: number | null
    relevance_score: number | null
    topical_score: number | null
    combined_score: number | null
    articles_fetched_at: string | null
    contacted_at: string | null
    bio_fetched_at: string | null
    bio_text: string | null
    bio_url: string | null
    ai_summary: string | null
    linkedin_title: string | null
    linkedin_scraped_at: string | null
    external_bio_text: string | null
    external_bio_url: string | null
    external_bio_source: string | null
    external_fetched_at: string | null
    twitter_bio: string | null
    beats: string[] | null
    beat_summary: string | null
    beats_classified_at: string | null
    pitch_preferences: Record<string, unknown> | null
    preferences_scraped_at: string | null
    last_seen_at: string | null
    went_quiet_at: string | null
    skipped: boolean | null
    skip_reason: string | null
    outreach_domains: { outlet_name: string; domain: string; tier: string; priority: string; dr: number | null } | { outlet_name: string; domain: string; tier: string; priority: string; dr: number | null }[] | null
  }) => {
    const domain = Array.isArray(e.outreach_domains) ? e.outreach_domains[0] : e.outreach_domains
    return {
      id: e.id,
      domain_id: e.domain_id,
      email: e.email,
      first_name: e.first_name,
      last_name: e.last_name,
      position: e.position,
      seniority: e.seniority,
      department: e.department,
      linkedin_url: e.linkedin_url,
      twitter_handle: e.twitter_handle,
      confidence: e.confidence,
      relevance_score: e.relevance_score,
      topical_score: e.topical_score,
      combined_score: e.combined_score,
      articles_fetched_at: e.articles_fetched_at,
      contacted_at: e.contacted_at,
      bio_fetched_at: e.bio_fetched_at,
      bio_text: e.bio_text,
      bio_url: e.bio_url,
      ai_summary: e.ai_summary,
      linkedin_title: e.linkedin_title,
      linkedin_scraped_at: e.linkedin_scraped_at,
      external_bio_text: e.external_bio_text,
      external_bio_url: e.external_bio_url,
      external_bio_source: e.external_bio_source,
      external_fetched_at: e.external_fetched_at,
      beats: e.beats,
      beat_summary: e.beat_summary,
      beats_classified_at: e.beats_classified_at,
      pitch_preferences: e.pitch_preferences,
      preferences_scraped_at: e.preferences_scraped_at,
      last_seen_at: e.last_seen_at,
      went_quiet_at: e.went_quiet_at,
      skipped: e.skipped ?? false,
      skip_reason: e.skip_reason,
      twitter_bio: e.twitter_bio,
      outlet_name: domain?.outlet_name ?? '—',
      outlet_domain: domain?.domain ?? '',
      outlet_tier: domain?.tier ?? '',
      outlet_priority: domain?.priority ?? 'P3',
      outlet_dr: domain?.dr ?? null,
    }
  })

  // Quota indicators
  const [hunterUsage, serperUsage, scrapingbeeUsage, gmailConn] = await Promise.all([
    getUsage(admin, 'hunter'),
    getUsage(admin, 'serper'),
    getUsage(admin, 'scrapingbee'),
    getGmailConnection(),
  ])

  // Pitch history
  const { data: pitchesRaw } = await admin
    .from('outreach_pitches')
    .select(`
      id, pitch_angle, subject, target_url, anchor_type, anchor_text, status,
      sent_at, replied_at, published_at, published_url, notes,
      outreach_editors (first_name, last_name, outreach_domains (outlet_name))
    `)
    .order('sent_at', { ascending: false, nullsFirst: false })

  const pitches: PitchRow[] = (pitchesRaw ?? []).map((p: {
    id: string
    pitch_angle: string
    subject: string
    target_url: string
    anchor_type: string
    anchor_text: string
    status: string
    sent_at: string | null
    replied_at: string | null
    published_at: string | null
    published_url: string | null
    notes: string | null
    outreach_editors:
      | { first_name: string | null; last_name: string | null; outreach_domains: { outlet_name: string } | { outlet_name: string }[] | null }
      | { first_name: string | null; last_name: string | null; outreach_domains: { outlet_name: string } | { outlet_name: string }[] | null }[]
      | null
  }) => {
    const ed = Array.isArray(p.outreach_editors) ? p.outreach_editors[0] : p.outreach_editors
    const domain = ed ? (Array.isArray(ed.outreach_domains) ? ed.outreach_domains[0] : ed.outreach_domains) : null
    const editorName = ed ? [ed.first_name, ed.last_name].filter(Boolean).join(' ') || '—' : '—'
    return {
      id: p.id,
      pitch_angle: p.pitch_angle,
      subject: p.subject,
      target_url: p.target_url,
      anchor_type: p.anchor_type,
      anchor_text: p.anchor_text,
      status: p.status,
      sent_at: p.sent_at,
      replied_at: p.replied_at,
      published_at: p.published_at,
      published_url: p.published_url,
      notes: p.notes,
      editor_name: editorName,
      outlet_name: domain?.outlet_name ?? '—',
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Outreach</h2>
        <p className="text-sm text-brand-muted mt-1">
          Editor discovery, pitch composer, and anchor tracker. {domains.length} domains loaded.
        </p>
      </div>

      {/* Quota indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuotaIndicator provider="hunter" used={hunterUsage.used} limit={hunterUsage.limit} />
        <QuotaIndicator provider="serper" used={serperUsage.used} limit={serperUsage.limit} />
        <QuotaIndicator provider="scrapingbee" used={scrapingbeeUsage.used} limit={scrapingbeeUsage.limit} />
      </div>

      {/* Gmail OAuth + reply detection */}
      <GmailConnect connected={gmailConn.connected} email={gmailConn.email} />

      <OutreachSettings />

      <FollowUpsPanel />

      <MovementsPanel />

      <CompetitorAndMediaPanels />

      <AnchorTracker />

      <DomainsList domains={domains} />

      <EditorsList editors={editors} />

      <PitchHistory pitches={pitches} />
    </div>
  )
}
