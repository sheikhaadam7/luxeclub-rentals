'use client'

import { useTranslation } from '@/lib/i18n/context'

const FAQ_COUNT = 7

export function FaqList() {
  const { t } = useTranslation()

  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`faq.q${i + 1}`),
    a: t(`faq.a${i + 1}`),
  }))

  return (
    <div className="space-y-3">
      {faqs.map(({ q, a }, i) => (
        <details
          key={i}
          className="group bg-brand-surface border border-brand-border rounded-[var(--radius-card)] overflow-hidden transition-colors duration-300 hover:border-brand-border-hover"
        >
          <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none">
            <span className="text-[15px] font-medium text-white">{q}</span>
            <svg
              className="w-4 h-4 text-brand-muted flex-shrink-0 transition-transform duration-300 group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 pb-5 space-y-3">
            {a.split('\n\n').map((paragraph, j) => (
              <p key={j} className="text-[14px] text-brand-muted leading-relaxed">{paragraph}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
