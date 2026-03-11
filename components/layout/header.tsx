'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserNav } from '@/components/layout/user-nav'
import { Button } from '@/components/ui/button'
import { Bell, Crown } from 'lucide-react'

export function Header() {
  const t = useTranslations('header')

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* 左侧导航链接 */}
      <nav className="hidden md:flex items-center gap-6">
        <Link
          href="/market/list"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('computeMarket')}
        </Link>
        <Link
          href="/ai-apps"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('aiApps')}
        </Link>
        <Link
          href="/ai-servers"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('aiServers')}
        </Link>
        <Link
          href="/private-cloud"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('privateCloud')}
        </Link>
        <Link
          href="/docs"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('docs')}
        </Link>
      </nav>

      {/* 右侧工具栏 */}
      <div className="flex items-center gap-2">
        {/* 会员订阅 */}
        <Button variant="ghost" size="sm" className="gap-2 text-amber-500">
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">{t('memberSubscription')}</span>
        </Button>

        {/* 通知 */}
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>

        {/* 主题切换 */}
        <ThemeToggle />

        {/* 用户菜单 */}
        <UserNav />
      </div>
    </header>
  )
}
