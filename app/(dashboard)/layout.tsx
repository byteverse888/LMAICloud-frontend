'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sidebarCollapsed } = useUIStore()
  const { isLoading, isAuthenticated, token, checkAuth } = useAuthStore()
  const router = useRouter()

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
      </div>
    </div>
  )
}
