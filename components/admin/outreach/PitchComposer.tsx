'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { draftPitch, savePitchAsSent, generatePitchOpener } from '@/app/actions/outreach'
import { PITCH_TEMPLATES, type AnchorType } from '@/lib/outreach/pitch-templates'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'

interface PitchComposerProps {
  editorId: string
  editorName: string
  editorEmail: string
  outletName: string
  onClose: () => void
  onSent?: () => void
}

export function PitchComposer({
  editorId, editorName, editorEmail, outletName, onClose, onSent,
}: PitchComposerProps) {
  const router = useRouter()
  const [angleId, setAngleId] = useState<string>(PITCH_TEMPLATES[0].id)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [anchorType, setAnchorType] = useState<AnchorType>('generic')
  const [anchorText, setAnchorText] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sendMessage, setSendMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [isDrafting, startDraftTransition] = useTransition()
  const [isSending, startSendTransition] = useTransition()
  const [isGeneratingOpener, startOpenerTransition] = useTransition()
  const [openerMessage, setOpenerMessage] = useState<string | null>(null)

  // Load draft when angle changes
  useEffect(() => {
    setLoadError(null)
    setSendMessage(null)
    startDraftTransition(async () => {
      const res = await draftPitch(editorId, angleId)
      if (res.error) {
        setLoadError(res.error)
        return
      }
      if (res.pitch) {
        setSubject(res.pitch.subject)
        setBody(res.pitch.body)
        setTargetUrl(res.pitch.targetUrl)
        setAnchorType(res.pitch.anchorType)
        setAnchorText(res.pitch.anchorText)
      }
    })
  }, [editorId, angleId])

  function handleGenerateOpener() {
    setOpenerMessage(null)
    startOpenerTransition(async () => {
      const res = await generatePitchOpener(editorId, angleId)
      if (res.error) {
        setOpenerMessage(`AI error: ${res.error}`)
        return
      }
      // Replace the opener paragraph in body (first paragraph after "Hi [name]," greeting)
      const opener = res.opener.trim()
      if (!opener) {
        setOpenerMessage('AI returned empty opener')
        return
      }

      // Body pattern: "Hi {name},\n\n<opener paragraph>\n\n<rest of body>"
      // Replace only the first paragraph after the greeting.
      const match = body.match(/^(Hi [^,]+,\s*\n\n)([^\n]+(?:\n(?!\n)[^\n]+)*)/)
      if (match) {
        const newBody = body.replace(match[0], `${match[1]}${opener}`)
        setBody(newBody)
        setOpenerMessage('AI opener inserted ✓')
      } else {
        // Fallback: prepend opener
        setBody(`${opener}\n\n${body}`)
        setOpenerMessage('AI opener prepended ✓')
      }
      setTimeout(() => setOpenerMessage(null), 3000)
    })
  }

  function handleCopy() {
    const text = `To: ${editorEmail}\nSubject: ${subject}\n\n${body}`
    navigator.clipboard.writeText(text).then(
      () => {
        setCopyMessage('Copied to clipboard')
        setTimeout(() => setCopyMessage(null), 2500)
      },
      () => setCopyMessage('Copy failed — select text manually')
    )
  }

  function handleMarkSent() {
    setSendMessage(null)
    startSendTransition(async () => {
      const res = await savePitchAsSent(
        editorId, angleId, subject, body, targetUrl, anchorType, anchorText
      )
      if (res.error) {
        setSendMessage({ ok: false, text: res.error })
      } else {
        setSendMessage({ ok: true, text: 'Saved as sent ✓' })
        router.refresh()
        onSent?.()
        setTimeout(() => onClose(), 1200)
      }
    })
  }

  const selectedTemplate = PITCH_TEMPLATES.find((t) => t.id === angleId)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-brand-surface border border-brand-border rounded max-w-3xl w-full my-8 max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-brand-surface border-b border-brand-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-display text-xl font-semibold text-white">Draft Pitch</h3>
            <p className="text-xs text-brand-muted mt-0.5">
              To {editorName} at {outletName}
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Angle selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-[0.12em]">
              Pitch Angle
            </label>
            <select
              value={angleId}
              onChange={(e) => setAngleId(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-cyan"
            >
              {PITCH_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="text-xs text-white/50">{selectedTemplate.description}</p>
            )}
          </div>

          {/* Anchor + URL preview (editable) */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target URL"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/catalogue"
            />
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-[0.12em]">
                Anchor Type
              </label>
              <select
                value={anchorType}
                onChange={(e) => setAnchorType(e.target.value as AnchorType)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-cyan"
              >
                <option value="branded">Branded (30%)</option>
                <option value="url">URL (25%)</option>
                <option value="generic">Generic (25%)</option>
                <option value="partial">Partial match (15%)</option>
                <option value="exact">Exact match (5%)</option>
              </select>
            </div>
          </div>

          <Input
            label="Anchor Text (as it appears in the outlet's article)"
            value={anchorText}
            onChange={(e) => setAnchorText(e.target.value)}
          />

          {/* Subject */}
          <Input
            label="Subject Line"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isDrafting}
          />

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-white/40 uppercase tracking-[0.12em]">
                Email Body
              </label>
              <button
                type="button"
                onClick={handleGenerateOpener}
                disabled={isGeneratingOpener}
                className="text-[11px] text-brand-cyan hover:text-brand-cyan-hover underline disabled:opacity-50"
              >
                {isGeneratingOpener ? 'Generating…' : '✨ Generate AI opener'}
              </button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isDrafting}
              rows={18}
            />
            {openerMessage && (
              <p className={`text-[11px] ${openerMessage.startsWith('AI error') ? 'text-red-400' : 'text-green-400'}`}>
                {openerMessage}
              </p>
            )}
          </div>

          {loadError && (
            <p className="text-xs text-red-400">{loadError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 text-white text-sm rounded hover:bg-white/15 transition-colors"
            >
              {copyMessage ?? 'Copy email to clipboard'}
            </button>
            <button
              type="button"
              onClick={handleMarkSent}
              disabled={isSending}
              className="flex-1 px-4 py-2.5 bg-brand-cyan text-white text-sm rounded hover:bg-brand-cyan-hover transition-colors disabled:opacity-50"
            >
              {isSending ? 'Saving…' : 'Mark as sent'}
            </button>
          </div>

          {sendMessage && (
            <p className={`text-xs text-center ${sendMessage.ok ? 'text-green-400' : 'text-red-400'}`}>
              {sendMessage.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
