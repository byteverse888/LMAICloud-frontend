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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

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
        
        // 401 跳转登录页（排除登录接口本身）
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          this.token = null
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token')
            window.location.href = '/login'
          }
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return { data, code: 0 }
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络错误'
      toast.error(message)
      throw error
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  async post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
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
