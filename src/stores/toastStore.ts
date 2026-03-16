import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'like' | 'hide'
  message: string
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  like: (message: string) => void
  hide: (message: string) => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }))
    setTimeout(() => {
      get().removeToast(id)
    }, 4000)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  success: (message) => get().addToast('success', message),
  error: (message) => get().addToast('error', message),
  info: (message) => get().addToast('info', message),
  like: (message) => get().addToast('like', message),
  hide: (message) => get().addToast('hide', message),
}))
