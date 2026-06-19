import type { ReactNode } from 'react'

interface HelpModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  variant?: 'default' | 'rules'
}

export function HelpModal({
  open,
  title,
  onClose,
  children,
  variant = 'default',
}: HelpModalProps) {
  if (!open) return null

  return (
    <div className="modal-overlay modal-overlay--rules" onClick={onClose} role="presentation">
      <div
        className={`modal ${variant === 'rules' ? 'modal--rules' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3 id="help-modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
