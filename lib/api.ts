import toast from 'react-hot-toast'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

interface ApiResponse<T = unknown> {
  data: T
  message?: string
  code?: number
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private refreshToken: string | null = null
  private refreshPromise: Promise<boolean> | null = null
  private onTokenRefreshed: ((token: string, refreshToken: string) => void) | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken
  }

  /** auth-store 注册回调，token 刷新后同步 zustand state */
  onRefreshed(cb: (token: string, refreshToken: string) => void) {
    this.onTokenRefreshed = cb
  }

  /** 用 refresh_token 换新 token，并发请求共享同一个 promise */
  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        })
        if (!res.ok) return false

        const data = await res.json()
        this.token = data.token
        this.refreshToken = data.refresh_token

        // 同步回 zustand store（会触发 localStorage 持久化）
        if (this.onTokenRefreshed) {
          this.onTokenRefreshed(data.token, data.refresh_token)
        }
        return true
      } catch {
        return false
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /** 从 zustand persist 存储中恢复 token（HMR / 模块重建时 fallback） */
  private getPersistedToken(): string | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('auth-storage')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.state?.token || null
    } catch {
      return null
    }
  }

  private getPersistedRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('auth-storage')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.state?.refreshToken || null
    } catch {
      return null
    }
  }

  /** 确保 token 已加载（内存没有则从 localStorage 恢复） */
  private ensureToken() {
    if (!this.token) {
      this.token = this.getPersistedToken()
      this.refreshToken = this.getPersistedRefreshToken()
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options
    let url = `${this.baseUrl}${endpoint}`

    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value))
      })
      url += `?${searchParams.toString()}`
    }

    const isFormData = fetchOptions.body instanceof FormData

    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...fetchOptions.headers,
    }

    // HMR 或模块重建后，内存 token 丢失，从 localStorage 恢复
    this.ensureToken()

    if (this.token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || errorData.message || '请求失败'
        
        // 401/403 且非认证相关接口 → 尝试用 refresh_token 续期
        // (HTTPBearer 无 token 时返回 403 "Not authenticated"，token 过期返回 401)
        const isAuthError = (response.status === 401 || response.status === 403) 
          && !endpoint.includes('/auth/login') 
          && !endpoint.includes('/auth/refresh')
        
        if (isAuthError) {
          const refreshed = await this.tryRefresh()
          if (refreshed) {
            // 刷新成功，用新 token 重试原请求
            ;(headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
            const retryResponse = await fetch(url, { ...fetchOptions, headers })
            if (retryResponse.ok) {
              const data = await retryResponse.json()
              return { data, code: 0 }
            }
          }
          // 刷新失败或重试仍然失败 → 清空登录态，跳转登录页
          this.token = null
          this.refreshToken = null
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
            window.location.href = '/login'
          }
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return { data, code: 0 }
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络错误'
      // 完整错误只进控制台，toast 面向用户只显示可读摘要
      console.error(`[API] ${endpoint} 请求失败:`, message)
      // 技术性错误（SQL/堆栈/DB 异常等）对用户无可读性，替换为友好文案
      const isTechnical = /sqlalchemy|asyncpg|traceback|\[SQL:|ProgrammingError|UndefinedColumn|Internal Server Error/i.test(message)
      const toastMessage = isTechnical ? '服务器内部错误，请稍后重试' : message
      // 固定 id：同一条错误消息在 api 层与页面 catch 重复 toast 时只更新同一条，
      // 避免同一报错（如无可调度节点）弹出两次；长文案完整展示并延长停留时间，
      // 截断会导致用户看不到完整指引（如「可用无卡模式启动」）
      toast.error(toastMessage, {
        id: `api-error:${toastMessage}`,
        duration: toastMessage.length > 40 ? 8000 : 4000,
      })
      throw error
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  async post<T>(endpoint: string, body?: unknown) {
    const isFormData = body instanceof FormData
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body as BodyInit : (body ? JSON.stringify(body) : undefined),
    })
  }

  async put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient(API_BASE_URL)
export default api

/**
 * 将后端返回的相对路径（如 /api/v1/system/logo/xxx.png）转为完整URL
 */
export function toFullUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // API_BASE_URL 形如 http://host:port/api/v1，截取到 /api/v1 之前的部分
  const idx = API_BASE_URL.indexOf('/api/')
  const origin = idx > 0 ? API_BASE_URL.substring(0, idx) : API_BASE_URL
  return `${origin}${path}`
}

/**
 * 计算 WebSocket 基址。new WebSocket() 不接受相对路径，必须是 ws(s)://host/path 绝对地址。
 * 规则：显式配了绝对 NEXT_PUBLIC_WS_URL 就用它；否则运行时按当前页面 origin 拼接，
 * 前缀从 NEXT_PUBLIC_API_URL 推导（去掉 /api/v1）。用 IP 或域名访问都自适应、同源无跨域。
 */
export function getWsBase(): string {
  if (typeof window === 'undefined') return ''
  const envWs = process.env.NEXT_PUBLIC_WS_URL
  if (envWs && /^wss?:\/\//i.test(envWs)) return envWs.replace(/\/+$/, '')
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const prefix = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/api\/v1$/, '')
  return `${proto}//${window.location.host}${prefix}`
}
