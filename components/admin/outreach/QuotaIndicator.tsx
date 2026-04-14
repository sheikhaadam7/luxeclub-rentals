interface QuotaIndicatorProps {
  provider: 'hunter' | 'serper' | 'scrapingbee'
  used: number
  limit: number
}

const PROVIDER_LABELS: Record<string, string> = {
  hunter: 'Hunter',
  serper: 'Serper',
  scrapingbee: 'ScrapingBee',
}

export function QuotaIndicator({ provider, used, limit }: QuotaIndicatorProps) {
  const pct = Math.round((used / limit) * 100)
  const warn = pct >= 80
  const full = pct >= 100
  const color = full ? 'text-red-400' : warn ? 'text-amber-400' : 'text-brand-cyan'
  const barColor = full ? 'bg-red-400' : warn ? 'bg-amber-400' : 'bg-brand-cyan'

  return (
    <div className="bg-brand-surface border border-brand-border p-3 rounded space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-brand-muted">{PROVIDER_LABELS[provider]}</span>
        <span className={`text-xs font-mono ${color}`}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}
