'use client'

import { useCurrency } from '@/lib/currency/context'

/** Renders a formatted price using the selected currency. */
export function PriceDisplay({
  amount,
  className,
  suffix,
  exact,
}: {
  amount: number
  className?: string
  suffix?: string
  exact?: boolean
}) {
  const { formatPrice } = useCurrency()
  return (
    <span className={className}>
      {formatPrice(amount, exact ? { exact: true } : undefined)}
      {suffix}
    </span>
  )
}
