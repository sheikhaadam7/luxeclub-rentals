'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { LoadingSparkle } from './LoadingSparkle'

/**
 * Global background-task tracker.
 *
 * Lets callers kick off async work (server actions, fetches, etc.) without
 * tying the lifecycle to the component that launched it. When the user
 * closes a modal mid-fetch, the task keeps running and the user still sees
 * a floating indicator + completion toast.
 *
 * Wrap the page / tab with <BackgroundTasksProvider>, then use the hook:
 *
 *   const { run } = useBackgroundTasks()
 *   await run('Scraping LinkedIn · Jane Doe', async () => {
 *     return await fetchLinkedInProfile(editorId)
 *   })
 */

interface TaskRecord {
  id: string
  label: string
  startedAt: number
  status: 'running' | 'done' | 'error'
  message?: string
}

interface BackgroundTasksContextValue {
  tasks: TaskRecord[]
  run: <T>(label: string, fn: () => Promise<T>, onDone?: (result: T) => string | void) => Promise<T | null>
  dismiss: (id: string) => void
}

const Ctx = createContext<BackgroundTasksContextValue | null>(null)

export function BackgroundTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TaskRecord[]>([])

  const dismiss = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>, onDone?: (result: T) => string | void): Promise<T | null> => {
      const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `task-${Math.random().toString(36).slice(2)}`
      setTasks((prev) => [...prev, { id, label, startedAt: Date.now(), status: 'running' }])
      try {
        const result = await fn()
        const doneMessage = onDone ? onDone(result) : undefined
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, status: 'done', message: doneMessage || 'done' }
              : t
          )
        )
        // Auto-dismiss success toasts after 4s
        setTimeout(() => dismiss(id), 4000)
        return result
      } catch (err) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, status: 'error', message: err instanceof Error ? err.message : 'failed' }
              : t
          )
        )
        return null
      }
    },
    [dismiss]
  )

  return (
    <Ctx.Provider value={{ tasks, run, dismiss }}>
      {children}
      <BackgroundTasksFloatingPanel />
    </Ctx.Provider>
  )
}

export function useBackgroundTasks() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBackgroundTasks must be inside BackgroundTasksProvider')
  return ctx
}

function BackgroundTasksFloatingPanel() {
  const ctx = useContext(Ctx)
  const [, tick] = useState(0)

  // Force 1s re-renders so the timers in LoadingSparkle stay live
  useEffect(() => {
    if (!ctx) return
    if (ctx.tasks.length === 0) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [ctx, ctx?.tasks.length])

  if (!ctx || ctx.tasks.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end w-[320px] max-w-[85vw]">
      {ctx.tasks.map((t) => (
        <div
          key={t.id}
          className={[
            'w-full px-3 py-2 rounded-xl backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.45)] flex items-center gap-2 text-xs',
            t.status === 'running' && 'bg-white/[0.08] border-white/15 text-white/90',
            t.status === 'done' && 'bg-green-500/15 border-green-500/30 text-green-300',
            t.status === 'error' && 'bg-red-500/15 border-red-500/30 text-red-300',
          ].filter(Boolean).join(' ')}
        >
          {t.status === 'running' ? (
            <LoadingSparkle startedAt={t.startedAt} />
          ) : t.status === 'done' ? (
            <span className="text-green-400">✓</span>
          ) : (
            <span className="text-red-400">⚠</span>
          )}
          <span className="flex-1 truncate">
            {t.label}
            {t.status !== 'running' && t.message && (
              <span className="block text-[10px] text-white/60 mt-0.5 truncate">{t.message}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => ctx.dismiss(t.id)}
            aria-label="Dismiss"
            className="text-white/40 hover:text-white text-xs leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
