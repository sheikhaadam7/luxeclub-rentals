import { clsx } from 'clsx'
import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  error?: string
  /** Visual theme. Defaults to 'dark' for backwards compatibility. */
  variant?: 'dark' | 'light'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, variant = 'dark', ...props }, ref) => {
    const isLight = variant === 'light'
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            className={clsx(
              isLight
                ? 'text-sm font-bold text-zinc-900'
                : 'text-[11px] font-medium uppercase tracking-[0.12em] text-white/40',
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          className={clsx(
            'w-full rounded-xl px-4 py-3 text-base outline-none transition-all duration-300',
            isLight ? 'border-2' : 'border',
            isLight
              ? 'bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-brand-cyan focus:shadow-[0_0_0_1px_rgba(201,169,110,0.2)]'
              : 'bg-white/[0.04] text-white placeholder:text-white/25 focus:border-brand-cyan focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(201,169,110,0.2),0_0_20px_rgba(201,169,110,0.06)]',
            isLight
              ? error
                ? 'border-red-500'
                : 'border-black'
              : error
                ? 'border-red-500/50'
                : 'border-white/[0.08]',
            className,
          )}
        />
        {error && (
          <span className={clsx('text-xs', isLight ? 'text-red-600' : 'text-red-400/90')}>
            {error}
          </span>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
