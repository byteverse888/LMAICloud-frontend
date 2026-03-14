import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import api from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setRefreshToken: (refreshToken: string | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: (redirectUrl?: string) => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => {
        set({ token })
        api.setToken(token)
      },

      setRefreshToken: (refreshToken) => {
        set({ refreshToken })
        api.setRefreshToken(refreshToken)
      },

      login: async (email: string, password: string) => {
        const response = await api.post<{ user: User; token: string; refresh_token: string }>('/auth/login', {
          email,
          password,
        })
        const { user, token, refresh_token } = response.data
        set({ user, token, refreshToken: refresh_token, isAuthenticated: true })
        api.setToken(token)
        api.setRefreshToken(refresh_token)
      },

      logout: (redirectUrl?: string) => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
        api.setToken(null)
        api.setRefreshToken(null)
        if (typeof window !== 'undefined') {
          window.location.href = redirectUrl || '/market/list'
        }
      },

      checkAuth: async () => {
        const { token, refreshToken } = get()
        if (!token) {
          set({ isLoading: false })
          return
        }
        
        try {
          api.setToken(token)
          api.setRefreshToken(refreshToken)
          // 注册 token 刷新回调，刷新成功后同步 zustand state
          api.onRefreshed((newToken, newRefreshToken) => {
            set({ token: newToken, refreshToken: newRefreshToken })
          })
          const response = await api.get<User>('/auth/me')
          set({ user: response.data, isAuthenticated: true, isLoading: false })
        } catch {
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false })
          api.setToken(null)
          api.setRefreshToken(null)
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        // 页面刷新后，zustand 从 localStorage 恢复 token，立即同步到 api client
        if (state?.token) {
          api.setToken(state.token)
          api.setRefreshToken(state.refreshToken)
          // 注册 token 刷新回调
          api.onRefreshed((newToken, newRefreshToken) => {
            useAuthStore.setState({ token: newToken, refreshToken: newRefreshToken })
          })
        }
      },
    }
  )
)
