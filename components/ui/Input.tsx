import { clsx } from 'clsx'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[11px] font-medium text-white/40 uppercase tracking-[0.12em]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          className={clsx(
            'w-full bg-white/[0.04] border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-300',
            'focus:border-brand-cyan focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(201,169,110,0.2),0_0_20px_rgba(201,169,110,0.06)]',
            error ? 'border-red-500/50' : 'border-white/[0.08]',
            className
          )}
        />
        {error && (
          <span className="text-xs text-red-400/90">{error}</span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
