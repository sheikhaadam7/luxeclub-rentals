'use client'
import Link from 'next/link'

const TABS = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'payments', label: 'Payments' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'locations', label: 'Locations' },
  { id: 'outreach', label: 'Outreach' },
] as const

export function AdminTabs({ activeTab }: { activeTab: string }) {
  return (
    <nav className="flex gap-1 border-b border-brand-border">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/admin?tab=${tab.id}`}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-brand-muted hover:text-white'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
