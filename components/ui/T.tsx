'use client'

import { useTranslation } from '@/lib/i18n/context'

/** Inline translation component for use in server pages */
export function T({ k }: { k: string }) {
  const { t } = useTranslation()
  return <>{t(k)}</>
}
