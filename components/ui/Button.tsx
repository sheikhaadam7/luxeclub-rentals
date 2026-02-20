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
        'w-full py-3 px-6 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-[#0099ff] text-white hover:bg-[#0077cc]',
        variant === 'ghost' && 'border border-white/20 text-white/70 hover:border-white/40 hover:text-white bg-transparent',
        className
      )}
    >
      {loading ? 'Please wait...' : children}
    </button>
  )
}
