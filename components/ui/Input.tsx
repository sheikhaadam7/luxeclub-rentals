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
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          className={clsx(
            'w-full bg-transparent border px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors',
            'focus:border-[#0099ff]',
            error ? 'border-red-500/60' : 'border-white/15',
            className
          )}
        />
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
