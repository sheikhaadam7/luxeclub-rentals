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
    <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors duration-200 hover:text-white group"
            >
              <span className="text-[15px] font-medium text-white/90 group-hover:text-white leading-snug pr-4">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 shrink-0 text-brand-muted transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
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
                <div className="pb-5">{item.answer}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
