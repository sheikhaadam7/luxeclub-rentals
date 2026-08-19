'use client'

import { useState } from 'react'

interface FaqItem {
  question: string
  answer: React.ReactNode
}

interface FaqAccordionProps {
  items: FaqItem[]
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={i}
            className="bg-white/[0.08] border border-brand-cyan/25 rounded-lg overflow-hidden transition-colors duration-200 hover:border-brand-cyan/50"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left group"
            >
              <span className="flex-1 text-base font-medium text-white/90 group-hover:text-white leading-snug">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 shrink-0 text-brand-cyan/70 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-4">{item.answer}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
