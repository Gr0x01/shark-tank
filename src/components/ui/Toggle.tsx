'use client'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}

export function Toggle({ checked, onChange, label, className = '' }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-3 group ${className}`}
    >
      <span className="font-display text-sm text-[var(--ink-700)] group-hover:text-[var(--ink-900)] transition-colors">
        {label}
      </span>
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out ${
          checked
            ? 'bg-[var(--cyan-600)]'
            : 'bg-[var(--ink-200)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </button>
  )
}
