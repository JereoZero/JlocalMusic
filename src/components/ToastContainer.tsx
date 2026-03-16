import { useToastStore } from '../stores/toastStore'
import { useThemeStore } from '../stores/themeStore'
import { X, CheckCircle, AlertCircle, Info, Heart, EyeOff } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  const { getPrimaryColor } = useThemeStore()
  const primaryColor = getPrimaryColor()

  if (toasts.length === 0) return null

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500'
      case 'error':
        return 'border-red-500'
      default:
        return null
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return primaryColor
    }
  }

  const getIcon = (type: string) => {
    const color = getIconColor(type)
    switch (type) {
      case 'success':
        return <CheckCircle size={18} style={{ color }} />
      case 'error':
        return <AlertCircle size={18} style={{ color }} />
      case 'info':
        return <Info size={18} style={{ color }} />
      case 'like':
        return <Heart size={18} style={{ color }} fill={primaryColor} />
      case 'hide':
        return <EyeOff size={18} style={{ color }} />
      default:
        return <Info size={18} style={{ color }} />
    }
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const borderColor = getBorderColor(toast.type)
        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-[#1a1a1a] animate-[slideIn_0.3s_ease-out]"
            style={{ 
              borderLeftWidth: '4px',
              borderLeftColor: borderColor || primaryColor,
              borderLeftStyle: 'solid'
            }}
          >
            {getIcon(toast.type)}
            <span className="text-white text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-white/70 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
