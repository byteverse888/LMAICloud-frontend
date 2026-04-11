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
  Users,
  Settings,
  Bot,
  Coins,
  Share2,
  ClipboardList,
  Bell,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import api, { toFullUrl } from '@/lib/api'

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
  const [siteName, setSiteName] = useState('')
  const [siteLogo, setSiteLogo] = useState('')

  // 获取平台名称和Logo
  useEffect(() => {
    api.get<{ site_name: string; site_logo?: string }>('/system/site-info')
      .then(({ data }) => {
        setSiteName(data.site_name)
        if (data.site_logo) setSiteLogo(data.site_logo)
      })
      .catch(() => {})
  }, [])

  const navItems: NavItem[] = [
    { title: t('home'), href: '/', icon: Home },
    { title: t('instances'), href: '/instances', icon: Server },
    { title: t('openclaw'), href: '/openclaw', icon: Bot },
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
        { title: t('points'), href: '/billing/points', icon: Coins },
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
        { title: t('userManagement'), href: '/account', icon: Users },
        { title: t('auditLog'), href: '/account/audit-log', icon: ClipboardList },
        { title: t('referral'), href: '/account/referral', icon: Share2 },
        { title: t('notifications'), href: '/notifications', icon: Bell },
        { title: t('settings'), href: '/account/settings', icon: Settings },
      ],
    },
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
                    'w-full justify-center h-10 rounded-lg transition-all duration-200',
                    active 
                      ? 'bg-primary/8 text-primary' 
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
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
                'w-full justify-between h-9 rounded-lg transition-all duration-200',
                active 
                  ? 'bg-primary/8 text-primary' 
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
              onClick={() => toggleExpanded(item.title)}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[13px]">{item.title}</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />
            </Button>
            {isExpanded && (
              <div className="ml-3 pl-3 border-l border-border/60">
                {item.children!.map((child) => renderNavItem(child, depth + 1))}
              </div>
            )}
          </>
        ) : (
          <Link href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start h-9 gap-2.5 rounded-lg transition-all duration-200',
                active 
                  ? 'bg-primary/8 text-primary font-medium border-l-2 border-primary -ml-px' 
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
            >
              <Icon className={cn('h-[18px] w-[18px]', active && 'text-primary')} />
              <span className="text-[13px]">{item.title}</span>
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border/60 bg-sidebar transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src={siteLogo ? toFullUrl(siteLogo) : '/logo.png'} alt="Logo" className="h-8 w-8 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }} />
            <span className="text-[15px] font-semibold text-foreground">{siteName}</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg hover:bg-muted/80"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="space-y-0.5 p-2">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>
    </aside>
  )
}
