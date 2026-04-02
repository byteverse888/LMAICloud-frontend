'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserNav } from '@/components/layout/user-nav'
import { Button } from '@/components/ui/button'
import { Bell, Crown, MessageSquare, Check } from 'lucide-react'
import { useUnreadCount, useNotifications, markAsRead, markAllRead } from '@/hooks/use-api'

export function Header() {
  const t = useTranslations('header')
  const { count: unreadCount, refresh: refreshUnread } = useUnreadCount()
  const { notifications } = useNotifications(1, 5)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkRead = async (id: string) => {
    await markAsRead(id)
    refreshUnread()
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    refreshUnread()
  }

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
        <Link href="/billing">
          <Button variant="ghost" size="sm" className="gap-1.5 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline text-[13px]">{t('memberSubscription')}</span>
          </Button>
        </Link>

        {/* 通知 */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative hover:bg-muted/80"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          {/* 通知下拉面板 */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-popover shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-medium text-sm">通知</span>
                {unreadCount > 0 && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={handleMarkAllRead}
                  >
                    <Check className="h-3 w-3" />
                    全部已读
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">暂无通知</div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{n.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t px-4 py-2">
                <Link
                  href="/notifications"
                  className="text-xs text-primary hover:underline block text-center"
                  onClick={() => setShowDropdown(false)}
                >
                  查看全部通知
                </Link>
              </div>
            </div>
          )}
        </div>

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
