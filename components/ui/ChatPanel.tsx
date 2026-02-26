'use client'

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { useTranslation, useLanguage } from '@/lib/i18n/context'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Session storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'luxeclub-chat'

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveMessages(messages: Message[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>(() => loadMessages())
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => loadMessages().length === 0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Persist messages to sessionStorage
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  // Send message and handle streaming response
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setShowWelcome(false)
    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    // Add placeholder assistant message
    const assistantIndex = newMessages.length
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          try {
            const { text: chunk, error } = JSON.parse(payload)
            if (error) throw new Error(error)
            if (chunk) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: updated[assistantIndex].content + chunk,
                }
                return updated
              })
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[assistantIndex] = {
          role: 'assistant',
          content: t('chat.errorMessage'),
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, messages, isStreaming, t])

  // Handle keyboard — Enter to send, Shift+Enter for newline
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div
      className={`fixed z-[80] transition-all duration-300 ${
        open
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      } ${
        // Mobile: full screen. Desktop: anchored panel
        'inset-0 md:inset-auto md:bottom-24 md:left-6'
      }`}
      style={{ animation: open ? 'chatSlideUp 300ms var(--ease-out-expo) both' : undefined }}
    >
      <div className="flex flex-col h-full md:h-auto md:max-h-[520px] md:w-[380px] md:rounded-2xl overflow-hidden border border-brand-border bg-brand-surface/95 backdrop-blur-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-glass">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-cyan" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-text">{t('chat.title')}</h3>
              <p className="text-xs text-brand-muted">LuxeClub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('chat.ariaClose')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {/* Welcome message */}
          {showWelcome && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 bg-white/5 text-sm text-brand-text leading-relaxed">
                {t('chat.welcomeMessage')}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-brand-cyan/20 text-brand-text rounded-br-sm'
                    : 'bg-white/5 text-brand-text rounded-bl-sm'
                }`}
              >
                {msg.content || (
                  <span className="text-brand-muted animate-pulse">{t('chat.thinking')}</span>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-brand-border bg-brand-glass">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.inputPlaceholder')}
              disabled={isStreaming}
              rows={1}
              className="flex-1 resize-none bg-white/5 border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan/40 input-focus-glow transition-colors disabled:opacity-50"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              aria-label={t('chat.send')}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-brand-cyan text-brand-black hover:bg-brand-cyan-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
