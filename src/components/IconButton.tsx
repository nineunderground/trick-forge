import type { ReactNode } from 'react'

interface IconButtonProps {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}

export function IconButton({ label, onClick, children, className = '' }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button secondary ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

export function HelpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.5 9.25a2.75 2.75 0 1 1 4.72 1.94c-.98.86-1.47 1.43-1.47 2.56V15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.25" r="1" fill="currentColor" />
    </svg>
  )
}

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 6 8 12l6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LeaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6H6.75A1.75 1.75 0 0 0 5 7.75v8.5A1.75 1.75 0 0 0 6.75 18H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 8.5 15.5 12 12 15.5M15 12H9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
