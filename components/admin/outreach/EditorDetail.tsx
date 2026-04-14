'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fetchEditorArticles, scrapeEditorBio, enrichEditorArticles, fetchLinkedInProfile } from '@/app/actions/outreach'
import type { EditorRow } from './EditorsList'
import { PitchComposer } from './PitchComposer'

interface Article {
  id: string
  url: string
  title: string
  snippet: string | null
  published_date: string | null
  topic_match_score: number
  topic_keywords: string[] | null
}

function keywordChipColor(score: number): string {
  if (score >= 70) return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (score >= 40) return 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30'
  if (score >= 20) return 'bg-amber-400/20 text-amber-400 border-amber-400/30'
  return 'bg-white/10 text-white/50 border-white/20'
}

interface EditorDetailProps {
  editor: EditorRow
  onClose: () => void
}

export function EditorDetail({ editor, onClose }: EditorDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [bioText, setBioText] = useState<string | null>(editor.bio_text ?? null)
  const [bioUrl, setBioUrl] = useState<string | null>(editor.bio_url ?? null)
  const [bioMessage, setBioMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isScraping, startScrapingTransition] = useTransition()
  const [isEnriching, startEnrichTransition] = useTransition()
  const [enrichMessage, setEnrichMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(editor.ai_summary ?? null)
  const [linkedinTitle, setLinkedinTitle] = useState<string | null>(editor.linkedin_title ?? null)
  const [isScrapingLinkedin, startLinkedinTransition] = useTransition()
  const [linkedinMessage, setLinkedinMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function handleScrapeLinkedIn() {
    setLinkedinMessage(null)
    startLinkedinTransition(async () => {
      const res = await fetchLinkedInProfile(editor.id)
      if (res.error) {
        setLinkedinMessage({ ok: false, text: res.error })
        return
      }
      setLinkedinTitle(res.linkedinTitle ?? null)
      setLinkedinMessage({
        ok: true,
        text: res.linkedinTitle ? `LinkedIn title: ${res.linkedinTitle}` : 'LinkedIn fetched but no title extracted',
      })
      router.refresh()
    })
  }

  function handleDeepEnrich() {
    setEnrichMessage(null)
    startEnrichTransition(async () => {
      const res = await enrichEditorArticles(editor.id)
      if (res.error) {
        setEnrichMessage({ ok: false, text: res.error })
        return
      }
      setAiSummary(res.summary)
      setEnrichMessage({ ok: true, text: `Fetched ${res.fetched} article(s), summary generated ✓` })
      router.refresh()
    })
  }

  function handleScrapeBio() {
    setBioMessage(null)
    startScrapingTransition(async () => {
      const res = await scrapeEditorBio(editor.id)
      if (res.error) {
        setBioMessage({ ok: false, text: res.error })
        return
      }
      setBioText(res.bioText)
      setBioUrl(res.bioUrl)
      setBioMessage({ ok: true, text: res.bioText ? 'Bio extracted ✓' : 'Author page found but no bio text' })
      router.refresh()
    })
  }

  // Load articles on mount if already fetched
  useEffect(() => {
    if (!editor.articles_fetched_at) {
      setArticles(null)
      return
    }
    async function load() {
      const res = await fetch(`/api/admin/editor-articles?editorId=${editor.id}`, { cache: 'no-store' })
      if (!res.ok) {
        setLoadError('Failed to load articles')
        return
      }
      const data = await res.json()
      setArticles(data.articles ?? [])
    }
    load()
  }, [editor.id, editor.articles_fetched_at])

  function handleFetch() {
    setMessage(null)
    startTransition(async () => {
      const res = await fetchEditorArticles(editor.id)
      if (res.error) {
        setMessage({ ok: false, text: res.error })
      } else {
        setMessage({
          ok: true,
          text: `Found ${res.inserted} articles. Coverage score: ${res.topicalScore ?? 'n/a'}`,
        })
        router.refresh()
        // Refetch articles list
        const r = await fetch(`/api/admin/editor-articles?editorId=${editor.id}`, { cache: 'no-store' })
        if (r.ok) {
          const data = await r.json()
          setArticles(data.articles ?? [])
        }
      }
    })
  }

  const name = [editor.first_name, editor.last_name].filter(Boolean).join(' ') || editor.email
  const googleSearchUrl = editor.first_name && editor.last_name
    ? `https://www.google.com/search?q=${encodeURIComponent(`"${editor.first_name} ${editor.last_name}" site:${editor.outlet_domain}`)}`
    : `https://www.google.com/search?q=${encodeURIComponent(`${editor.email} site:${editor.outlet_domain}`)}`

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-brand-surface border border-brand-border rounded max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-brand-surface border-b border-brand-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-display text-xl font-semibold text-white">{name}</h3>
            <p className="text-xs text-brand-muted mt-0.5">
              {editor.position ?? 'Unknown position'} · {editor.outlet_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile fields */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted mb-1">Email</p>
              <a href={`mailto:${editor.email}`} className="text-brand-cyan hover:underline font-mono text-xs">
                {editor.email}
              </a>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted mb-1">Confidence</p>
              <p className="text-white">{editor.confidence ?? '—'}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted mb-1">Department</p>
              <p className="text-white">{editor.department ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted mb-1">Seniority</p>
              <p className="text-white">{editor.seniority ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted mb-1">Match score</p>
              <p className="text-white font-mono">{editor.relevance_score ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted mb-1">Overall score</p>
              <p className="text-white font-mono">{editor.combined_score ?? '—'}</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-3 text-xs">
            {editor.linkedin_url && (
              <a href={editor.linkedin_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-blue-400/30 text-blue-400 rounded hover:bg-blue-400/10 transition-colors">
                LinkedIn
              </a>
            )}
            {editor.twitter_handle && (
              <a href={`https://twitter.com/${editor.twitter_handle}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-white/20 text-white/70 rounded hover:bg-white/5 transition-colors">
                Twitter / X
              </a>
            )}
            <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-white/20 text-white/70 rounded hover:bg-white/5 transition-colors">
              Search Google manually
            </a>
          </div>

          {/* LinkedIn section */}
          {editor.linkedin_url && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-medium text-white uppercase tracking-wider">
                  LinkedIn Title
                </h4>
                <button
                  type="button"
                  onClick={handleScrapeLinkedIn}
                  disabled={isScrapingLinkedin}
                  className="px-3 py-1.5 text-xs border border-blue-400/30 text-blue-400 rounded hover:bg-blue-400/10 transition-colors disabled:opacity-50"
                  title="Scrapes the public LinkedIn headline via ScrapingBee (~25 credits)"
                >
                  {isScrapingLinkedin
                    ? 'Scraping…'
                    : editor.linkedin_scraped_at
                      ? 'Re-scrape LinkedIn'
                      : 'Fetch LinkedIn title'}
                </button>
              </div>
              {linkedinMessage && (
                <p className={`text-[11px] ${linkedinMessage.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {linkedinMessage.text}
                </p>
              )}
              {linkedinTitle ? (
                <div className="text-sm text-white bg-blue-400/[0.05] border border-blue-400/20 rounded p-3">
                  {linkedinTitle}
                  {editor.position && editor.position !== linkedinTitle && (
                    <p className="text-[11px] text-white/50 mt-1">
                      Hunter position: <span className="text-white/70">{editor.position}</span>
                    </p>
                  )}
                </div>
              ) : editor.linkedin_scraped_at ? (
                <p className="text-xs text-white/40 italic">LinkedIn fetched but no headline extracted (profile may be gated).</p>
              ) : (
                <p className="text-xs text-white/50 italic">
                  Scrape LinkedIn to cross-check the job title. Useful when Hunter&apos;s position is null or stale.
                </p>
              )}
            </div>
          )}

          {/* External bio (Muckrack / personal site / etc) */}
          {editor.external_bio_text && (
            <div className="space-y-2">
              <h4 className="font-display text-sm font-medium text-white uppercase tracking-wider flex items-center gap-2">
                External Bio
                {editor.external_bio_source && (
                  <span className="text-[10px] font-normal text-white/50 px-1.5 py-0.5 bg-white/5 rounded">
                    {editor.external_bio_source}
                  </span>
                )}
              </h4>
              <div className="text-xs text-white/70 leading-relaxed bg-white/[0.02] border border-white/[0.05] rounded p-3">
                <p className="whitespace-pre-wrap">{editor.external_bio_text}</p>
                {editor.external_bio_url && (
                  <a href={editor.external_bio_url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan text-[11px] mt-2 inline-block hover:underline">
                    Source ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Twitter / X bio */}
          {editor.twitter_bio && (
            <div className="space-y-2">
              <h4 className="font-display text-sm font-medium text-white uppercase tracking-wider">
                X / Twitter Bio
              </h4>
              <div className="text-xs text-white/70 leading-relaxed bg-white/[0.02] border border-white/[0.05] rounded p-3">
                <p className="whitespace-pre-wrap">{editor.twitter_bio}</p>
              </div>
            </div>
          )}

          {/* Bio section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-medium text-white uppercase tracking-wider">
                Editor Bio
              </h4>
              <button
                type="button"
                onClick={handleScrapeBio}
                disabled={isScraping}
                className="px-3 py-1.5 text-xs border border-white/15 text-white hover:bg-white/5 transition-colors rounded disabled:opacity-50"
              >
                {isScraping
                  ? 'Scraping…'
                  : editor.bio_fetched_at
                    ? 'Re-scrape bio'
                    : 'Fetch bio (Serper + ScrapingBee)'}
              </button>
            </div>
            {bioMessage && (
              <p className={`text-[11px] ${bioMessage.ok ? 'text-green-400' : 'text-red-400'}`}>
                {bioMessage.text}
              </p>
            )}
            {bioText ? (
              <div className="text-xs text-white/70 leading-relaxed bg-white/[0.02] border border-white/[0.05] rounded p-3">
                <p className="whitespace-pre-wrap">{bioText}</p>
                {bioUrl && (
                  <a href={bioUrl} target="_blank" rel="noopener noreferrer" className="text-brand-cyan text-[11px] mt-2 inline-block hover:underline">
                    Source ↗
                  </a>
                )}
              </div>
            ) : editor.bio_fetched_at ? (
              <p className="text-xs text-white/40 italic">Bio page found but no readable text extracted.</p>
            ) : (
              <p className="text-xs text-white/50 italic">
                Not fetched yet. Scraping uses 1 Serper credit + 1 ScrapingBee credit. Bio keywords boost the topical score.
              </p>
            )}
          </div>

          {/* Articles section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-medium text-white uppercase tracking-wider">
                Published Articles
              </h4>
              <button
                type="button"
                onClick={handleFetch}
                disabled={isPending}
                className="px-3 py-1.5 text-xs bg-brand-cyan text-white rounded hover:bg-brand-cyan-hover transition-colors disabled:opacity-50"
              >
                {isPending
                  ? 'Searching Google…'
                  : editor.articles_fetched_at
                    ? 'Refresh articles'
                    : 'Fetch articles from Google'}
              </button>
            </div>
            {message && (
              <p className={`text-xs ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}
            {loadError && <p className="text-xs text-red-400">{loadError}</p>}

            {!editor.articles_fetched_at && (
              <p className="text-xs text-white/50 italic">
                No articles fetched yet. Click the button above — this costs 1 Serper credit.
              </p>
            )}

            {articles && articles.length === 0 && (
              <p className="text-xs text-white/50 italic">
                Google found no articles by this editor on {editor.outlet_domain}. Try the manual search link above.
              </p>
            )}

            {articles && articles.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-white/40">
                    Top articles shown first. Keyword chips indicate topical match.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeepEnrich}
                    disabled={isEnriching}
                    className="px-3 py-1 text-[11px] border border-purple-400/30 text-purple-400 rounded hover:bg-purple-400/10 disabled:opacity-50"
                  >
                    {isEnriching
                      ? 'Enriching…'
                      : aiSummary
                        ? '✨ Re-enrich (3 SB credits)'
                        : '✨ Deep enrich (3 SB credits)'}
                  </button>
                </div>
                {enrichMessage && (
                  <p className={`text-[11px] ${enrichMessage.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {enrichMessage.text}
                  </p>
                )}
                {aiSummary && (
                  <div className="text-xs text-white/80 leading-relaxed bg-purple-400/[0.05] border border-purple-400/20 rounded p-3">
                    <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-1.5">AI Coverage Summary</p>
                    <p className="whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}
              </>
            )}
            {articles && articles.length > 0 && (
              <ul className="space-y-3">
                {articles
                  .sort((a, b) => b.topic_match_score - a.topic_match_score)
                  .map((a) => (
                    <li key={a.id} className="border border-white/10 rounded p-3 space-y-1.5 hover:bg-white/[0.02]">
                      <div className="flex items-start justify-between gap-3">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white hover:text-brand-cyan transition-colors flex-1"
                        >
                          {a.title}
                        </a>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${keywordChipColor(a.topic_match_score)} shrink-0`}>
                          {a.topic_match_score}
                        </span>
                      </div>
                      {a.snippet && (
                        <p className="text-xs text-white/50 line-clamp-2">{a.snippet}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {(a.topic_keywords ?? []).map((kw) => (
                          <span key={kw} className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">
                            {kw}
                          </span>
                        ))}
                        {a.published_date && (
                          <span className="text-[10px] text-white/40 ml-auto">
                            {new Date(a.published_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Draft pitch button */}
          <div className="pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="w-full px-4 py-2.5 bg-brand-cyan text-white text-sm rounded hover:bg-brand-cyan-hover transition-colors"
            >
              Draft pitch
            </button>
          </div>
        </div>
      </div>

      {showComposer && (
        <PitchComposer
          editorId={editor.id}
          editorName={name}
          editorEmail={editor.email}
          outletName={editor.outlet_name}
          onClose={() => setShowComposer(false)}
          onSent={onClose}
        />
      )}
    </div>
  )
}
