'use client'

import { MusicProvider } from '@/components/ui/BackgroundMusic'

export function Providers({ children }: { children: React.ReactNode }) {
  return <MusicProvider>{children}</MusicProvider>
}
