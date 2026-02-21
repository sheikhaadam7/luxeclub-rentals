import { clsx } from 'clsx'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'w-full py-3 px-6 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
        variant === 'primary' && 'bg-brand-cyan text-white hover:bg-brand-cyan-hover shadow-[0_0_20px_rgba(0,135,90,0.15)] hover:shadow-[0_0_30px_rgba(0,135,90,0.25)]',
        variant === 'ghost' && 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white bg-transparent',
        className
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Please wait...
        </span>
      ) : children}
    </button>
  )
}
