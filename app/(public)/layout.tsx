'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserNav } from '@/components/layout/user-nav'
import { Button } from '@/components/ui/button'
import { Bell, Crown, ChevronDown } from 'lucide-react'
import api from '@/lib/api'

interface SiteInfo {
  site_name: string
  site_logo?: string
  footer_text?: string
  icp_number?: string
  icp_link?: string
  police_number?: string
  copyright_text?: string
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('header')
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({ site_name: 'LMAICloud' })

  useEffect(() => {
    api.get<SiteInfo>('/system/site-info')
      .then(({ data }) => setSiteInfo(data))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部公告栏 */}
      <div className="bg-orange-500 text-white text-sm text-center py-2 px-4">
        西北B区、北京B区和重庆A区均已上线PRO 6000，关于PRO 6000介绍和性能可 
        <Link href="#" className="underline mx-1">参考文档</Link>。
        北京B区将于2月11日上线A800 80GB NVLink版本GPU。
      </div>

      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        {/* 左侧 Logo + 导航 */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            {siteInfo.site_logo ? (
              <img src={siteInfo.site_logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
            )}
            <span className="font-semibold text-xl">{siteInfo.site_name}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/market/list"
              className="text-sm font-medium text-foreground transition-colors"
            >
              算力市场
            </Link>
            <Link
              href="/ai-apps"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              AI应用
            </Link>
            <Link
              href="/ai-servers"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              AI服务器
            </Link>
            <Link
              href="/private-cloud"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              私有云
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              帮助文档
            </Link>
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              更多
              <ChevronDown className="h-4 w-4" />
            </div>
          </nav>
        </div>

        {/* 右侧工具栏 */}
        <div className="flex items-center gap-4">
          {/* 控制台入口 */}
          <Link href="/instances">
            <Button variant="outline" size="sm">
              控制台
            </Button>
          </Link>

          {/* 用户菜单 */}
          <UserNav />
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-6 py-4">{children}</main>

      {/* 页脚 */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground space-y-1">
        <div>{siteInfo.copyright_text || `©2021-2026 ${siteInfo.site_name}`}</div>
        <div className="flex items-center justify-center gap-4">
          {siteInfo.icp_number && (
            <a href={siteInfo.icp_link || 'https://beian.miit.gov.cn/'} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              {siteInfo.icp_number}
            </a>
          )}
          {siteInfo.police_number && (
            <span>{siteInfo.police_number}</span>
          )}
        </div>
        {siteInfo.footer_text && <div>{siteInfo.footer_text}</div>}
      </footer>
    </div>
  )
}
