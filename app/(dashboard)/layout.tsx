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
  const [footerText, setFooterText] = useState('')
  const [copyrightText, setCopyrightText] = useState('')
  const [icpNumber, setIcpNumber] = useState('')
  const [icpLink, setIcpLink] = useState('https://beian.miit.gov.cn/')

  // 获取版权和备案信息
  useEffect(() => {
    api.get<{ copyright_text?: string; site_name?: string; footer_text?: string; icp_number?: string; icp_link?: string }>('/system/site-info')
      .then(({ data }) => {
        if (data.footer_text) setFooterText(data.footer_text)
        if (data.copyright_text) setCopyrightText(data.copyright_text)
        if (data.site_name) document.title = `${data.site_name} - GPU算力云平台`
        if (data.icp_number) setIcpNumber(data.icp_number)
        if (data.icp_link) setIcpLink(data.icp_link)
      })
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
        {(footerText || copyrightText || icpNumber) && (
          <footer className="py-4 text-center text-xs text-muted-foreground border-t mx-5 lg:mx-7 space-y-1">
            {copyrightText && <div>{copyrightText}</div>}
            {(footerText || icpNumber) && (
              <div className="flex items-center justify-center gap-2">
                {footerText && <span>{footerText}</span>}
                {footerText && icpNumber && <span>|</span>}
                {icpNumber && <span>{icpNumber}</span>}
              </div>
            )}
          </footer>
        )}
      </div>
    </div>
  )
}
