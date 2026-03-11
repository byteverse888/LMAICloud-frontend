'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Home,
  Server,
  HardDrive,
  Layers,
  Database,
  CircleDollarSign,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Receipt,
  CreditCard,
  Ticket,
  Gift,
  FileCheck,
  Shield,
  History,
  Users,
  Settings,
  MessageSquare,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const [expandedItems, setExpandedItems] = useState<string[]>(['billing', 'account'])
  const [siteName, setSiteName] = useState('LMAICloud')

  // 获取平台名称
  useEffect(() => {
    api.get<{ site_name: string }>('/system/site-info')
      .then(({ data }) => setSiteName(data.site_name))
      .catch(() => {})
  }, [])

  const navItems: NavItem[] = [
    { title: t('home'), href: '/', icon: Home },
    { title: t('instances'), href: '/instances', icon: Server },
    { title: t('storage'), href: '/storage', icon: HardDrive },
    { title: t('images'), href: '/images', icon: Layers },
    { title: t('publicData'), href: '/public-data', icon: Database },
    {
      title: t('billing'),
      href: '/billing',
      icon: CircleDollarSign,
      children: [
        { title: t('billingDetails'), href: '/billing/details', icon: FileText },
        { title: t('orders'), href: '/billing/orders', icon: Receipt },
        { title: t('statements'), href: '/billing/statements', icon: CreditCard },
        // 以下功能暂时隐藏
        // { title: t('coupons'), href: '/billing/coupons', icon: Ticket },
        // { title: t('vouchers'), href: '/billing/vouchers', icon: Gift },
        // { title: t('invoices'), href: '/billing/invoices', icon: FileCheck },
        // { title: t('contracts'), href: '/billing/contracts', icon: FileText },
      ],
    },
    {
      title: t('account'),
      href: '/account',
      icon: User,
      children: [
        { title: t('security'), href: '/account/security', icon: Shield },
        { title: t('accessLog'), href: '/account/access-log', icon: History },
        { title: t('settings'), href: '/account/settings', icon: Settings },
      ],
    },
    { title: t('tickets'), href: '/tickets', icon: MessageSquare },
  ]

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const active = isActive(item.href)
    const Icon = item.icon

    if (sidebarCollapsed) {
      return (
        <TooltipProvider key={item.href} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={hasChildren ? item.children![0].href : item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-center h-10 transition-all duration-200',
                    active 
                      ? 'bg-primary/10 text-primary shadow-sm' 
                      : 'hover:bg-primary/5 hover:text-primary'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <div key={item.href}>
        {hasChildren ? (
          <>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-between h-10 transition-all duration-200',
                active 
                  ? 'bg-primary/10 text-primary' 
                  : 'hover:bg-primary/5 hover:text-primary'
              )}
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
              onClick={() => toggleExpanded(item.title)}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </Button>
            {isExpanded && (
              <div className="ml-4">
                {item.children!.map((child) => renderNavItem(child, depth + 1))}
              </div>
            )}
          </>
        ) : (
          <Link href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start h-10 gap-3 transition-all duration-200',
                active 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'hover:bg-primary/5 hover:text-primary'
              )}
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span>{item.title}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300 shadow-sm',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4 bg-gradient-to-r from-primary/5 to-transparent">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-lg font-semibold gradient-text">{siteName}</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-primary/10"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <nav className="space-y-1 p-2">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>
    </aside>
  )
}
