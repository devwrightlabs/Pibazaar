import { forwardRef, type ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-gold text-black hover:opacity-90',
  outline: 'border border-gold text-gold bg-transparent hover:bg-gold/10',
  ghost: 'text-text-sub hover:bg-control-bg',
  icon: 'text-text-sub hover:bg-control-bg p-2',
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg min-h-[44px]',
  md: 'px-5 py-2.5 text-sm rounded-xl min-h-[44px]',
  lg: 'px-6 py-3 text-base rounded-xl min-h-[44px]',
  icon: 'p-2 rounded-lg min-h-[44px] min-w-[44px]',
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading = false, className = '', type = 'button', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            <span className="ml-2">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

// Compatibility shim for shadcn-style components that import buttonVariants
export function buttonVariants({
  variant = 'default',
  size = 'md',
  className = '',
}: {
  variant?: 'default' | 'outline' | 'ghost' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  className?: string
} = {}): string {
  const v = variant === 'icon' ? 'ghost' : (variant as 'default' | 'outline' | 'ghost')
  const s = size === 'icon' ? 'sm' : (size as 'sm' | 'md' | 'lg')
  const vs = variantStyles[v] ?? variantStyles.default
  const ss = sizeStyles[s] ?? sizeStyles.sm
  return [
    'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
    vs, ss, className,
  ].filter(Boolean).join(' ')
}
