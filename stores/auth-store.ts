import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import api from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: (redirectUrl?: string) => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => {
        set({ token })
        api.setToken(token)
      },

      login: async (email: string, password: string) => {
        const response = await api.post<{ user: User; token: string }>('/auth/login', {
          email,
          password,
        })
        const { user, token } = response.data
        set({ user, token, isAuthenticated: true })
        api.setToken(token)
      },

      logout: (redirectUrl?: string) => {
        set({ user: null, token: null, isAuthenticated: false })
        api.setToken(null)
        if (typeof window !== 'undefined') {
          window.location.href = redirectUrl || '/login'
        }
      },

      checkAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isLoading: false })
          return
        }
        
        try {
          api.setToken(token)
          const response = await api.get<User>('/auth/me')
          set({ user: response.data, isAuthenticated: true, isLoading: false })
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false })
          api.setToken(null)
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)
