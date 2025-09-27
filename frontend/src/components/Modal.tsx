import { ReactNode, MouseEvent } from 'react'

type ModalProps = {
  title?: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null

  function onBackdrop(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={onBackdrop}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      aria-modal="true"
      role="dialog"
    >
      <div style={{ background: '#fff', minWidth: 420, maxWidth: 640, borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Close" style={{ fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
