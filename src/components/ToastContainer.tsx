import { useToast, type ToastType } from '../store/useToast'

const ALERT_CLASS: Record<ToastType, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
}

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts)
  const dismiss = useToast((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="toast toast-end z-[200]">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          onClick={() => dismiss(t.id)}
          className={`alert ${ALERT_CLASS[t.type]} shadow-lg cursor-pointer`}
        >
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
