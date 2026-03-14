'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserNav } from '@/components/layout/user-nav'
import { Button } from '@/components/ui/button'
import { Bell, Crown, MessageSquare } from 'lucide-react'

export function Header() {
  const t = useTranslations('header')

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 px-6">
      {/* 左侧导航链接 */}
      <nav className="hidden md:flex items-center gap-6">
        <Link
          href="/market/list"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
        >
          {t('computeMarket')}
        </Link>
        <Link
          href="/ai-apps"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
        >
          {t('aiApps')}
        </Link>
        <Link
          href="/ai-servers"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
        >
          {t('aiServers')}
        </Link>
        <Link
          href="/private-cloud"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
        >
          {t('privateCloud')}
        </Link>
        <Link
          href="/docs"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
        >
          {t('docs')}
        </Link>
      </nav>

      {/* 右侧工具栏 */}
      <div className="flex items-center gap-1.5">
        {/* 会员订阅 */}
        <Button variant="ghost" size="sm" className="gap-1.5 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500">
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline text-[13px]">{t('memberSubscription')}</span>
        </Button>

        {/* 通知 */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative hover:bg-muted/80">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
            3
          </span>
        </Button>

        {/* 工单 */}
        <Link href="/tickets">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/80" title={t('tickets')}>
            <MessageSquare className="h-4 w-4" />
          </Button>
        </Link>

        {/* 主题切换 */}
        <ThemeToggle />

        {/* 用户菜单 */}
        <UserNav />
      </div>
    </header>
  )
}
