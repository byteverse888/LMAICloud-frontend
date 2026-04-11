'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sidebarCollapsed } = useUIStore()
  const { isLoading, isAuthenticated, token, checkAuth } = useAuthStore()
  const router = useRouter()
  const [copyrightText, setCopyrightText] = useState('')

  // 获取版权信息
  useEffect(() => {
    api.get<{ copyright_text?: string }>('/system/site-info')
      .then(({ data }) => { if (data.copyright_text) setCopyrightText(data.copyright_text) })
      .catch(() => {})
  }, [])

  // 页面加载/刷新时验证 token 并加载用户信息
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // 认证检查完成后，未登录跳转到市场首页
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !token) {
      router.replace('/market/list')
    }
  }, [isLoading, isAuthenticated, token, router])

  // 认证检查中，显示 loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 未认证（等待跳转中）
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        )}
      >
        <Header />
        <main className="p-5 lg:p-7">{children}</main>
        {/* 版权页脚 */}
        {copyrightText && (
          <footer className="py-4 text-center text-xs text-muted-foreground border-t mx-5 lg:mx-7">
            {copyrightText}
          </footer>
        )}
      </div>
    </div>
  )
}
