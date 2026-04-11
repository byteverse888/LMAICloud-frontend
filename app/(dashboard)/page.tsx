'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Server,
  HardDrive,
  ExternalLink,
  CreditCard,
  Loader2,
  Cpu,
  TrendingUp,
  Coins,
  ShoppingCart,
  Receipt,
  Store,
  Bot,
  FolderOpen,
  ArrowRight,
  Wallet,
  BadgeCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useInstances, useBalance, useStorageQuota, useSiteInfo, useCurrentUser, usePoints } from '@/hooks/use-api'
import { useOpenClawInstances } from '@/hooks/use-openclaw'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const { instances, loading: instancesLoading } = useInstances()
  const { balance, loading: balanceLoading } = useBalance()
  const { quota: storageQuota, loading: storageLoading } = useStorageQuota()
  const { siteInfo } = useSiteInfo()
  const { user: currentUser } = useCurrentUser()
  const { points } = usePoints()
  const { instances: ocInstances } = useOpenClawInstances()

  // 计算统计数据（全部来自真实 API）
  // 有效实例 = 排除已释放/错误状态
  const activeInstances = instances.filter(i => !['released', 'error'].includes(i.status))
  const runningCount = instances.filter(i => i.status === 'running').length
  const stoppedCount = instances.filter(i => i.status === 'stopped').length
  // 智能体实例统计
  const activeOcInstances = ocInstances.filter(i => !['released', 'error'].includes(i.status))
  const ocRunningCount = ocInstances.filter(i => i.status === 'running').length
  const totalDiskGB = storageQuota ? +(storageQuota.total / (1024 ** 3)).toFixed(1) : 0
  const usedDiskGB = storageQuota ? +(storageQuota.used / (1024 ** 3)).toFixed(2) : 0
  const nickname = currentUser?.nickname || currentUser?.email?.split('@')[0] || '--'
  const verified = currentUser?.verified ?? false
  const instanceQuota = (currentUser as any)?.instance_quota ?? 20

  const loading = instancesLoading || balanceLoading || storageLoading

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 首页公告 */}
      {siteInfo?.announcement_text?.trim() && (
        <div className="rounded-lg bg-primary/10 dark:bg-primary/15 border border-primary/20 px-4 py-3 text-sm text-foreground/90 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <span>{siteInfo.announcement_text}</span>
        </div>
      )}

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('title')}
        </h1>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* 快捷统计卡片（余额/积分已在右侧费用信息中展示，此处隐藏避免重复） */}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧主内容区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 实例概览 */}
          <Card className="card-clean overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="card-header-bar text-base font-medium flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  {t('instanceOverview')}
                </CardTitle>
                <Link href="/instances">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {t('viewAll')} <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('containerInstances')}</div>
                  <div className="text-2xl font-bold text-primary">{activeInstances.length}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">智能体实例</div>
                  <div className="text-2xl font-bold text-violet-500">{activeOcInstances.length}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('running')}</div>
                  <div className="text-2xl font-bold text-emerald-500">{runningCount + ocRunningCount}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('stopped')}</div>
                  <div className="text-2xl font-bold text-muted-foreground">{stoppedCount}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('instanceQuota')}</div>
                  <div className="text-2xl font-bold">
                    {activeInstances.length + activeOcInstances.length}<span className="text-base font-normal text-muted-foreground"> / {instanceQuota}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 存储概览 */}
          <Card className="card-clean overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="card-header-bar text-base font-medium flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  {t('storageOverview')}
                </CardTitle>
                <Link href="/storage">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {t('viewAll')} <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('totalStorage')}</div>
                  <div className="text-2xl font-bold">
                    {totalDiskGB}
                    <span className="text-sm font-normal text-muted-foreground"> GB</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('usedStorage')}</div>
                  <div className="text-2xl font-bold">
                    {usedDiskGB}
                    <span className="text-sm font-normal text-muted-foreground"> GB</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 快捷入口 */}
          <Card className="card-clean overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="card-header-bar text-base font-medium flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-primary" />
                {t('quickLinks')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/instances" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Server className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">{t('myInstances')}</span>
                </Link>
                <Link href="/storage" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <FolderOpen className="h-6 w-6 text-blue-500" />
                  <span className="text-xs text-muted-foreground">{t('myStorage')}</span>
                </Link>
                <Link href="/openclaw" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Bot className="h-6 w-6 text-violet-500" />
                  <span className="text-xs text-muted-foreground">{t('openClaw')}</span>
                </Link>
                <Link href="/market/list" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Store className="h-6 w-6 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">{t('market')}</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-6">
          {/* 用户信息 */}
          <Card className="card-clean overflow-hidden">
            <div className="h-12 bg-gradient-to-r from-primary/80 to-primary/50 dark:from-primary/30 dark:to-primary/10" />
            <CardContent className="pt-0 relative">
              <div className="-mt-8 mb-4">
                <div className="h-16 w-16 rounded-full bg-background border-4 border-background flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-primary">{(currentUser?.nickname || currentUser?.email || '用')[0]}</span>
                </div>
              </div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{nickname}</span>
                  <Link href="/account" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm mb-1">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">{t('points')}：</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{points}</span>
              </div>
              <Link href="/billing/points" className="text-sm text-primary hover:underline block mt-3">
                {t('pointsDetail')} &gt;
              </Link>
              <Link href="/account/referral" className="text-sm text-primary hover:underline block mt-1">
                {t('referralCenter')} &gt;
              </Link>
            </CardContent>
          </Card>

          {/* 费用信息 */}
          <Card className="card-clean overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="card-header-bar text-base font-medium flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {t('balanceInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">{t('myBalance')}</span>
                <Link href="/billing">
                  <Button size="sm" variant="default">
                    {t('recharge')}
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <span className="text-sm text-muted-foreground">{t('available')}：</span>
                  <span className={`text-xl font-bold ${balance < 0 ? 'text-red-500' : ''}`}>
                    ¥{balance.toFixed(2)}
                  </span>
                </div>

              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-sm">
                <Link href="/billing/orders" className="text-primary hover:underline flex items-center gap-1">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {t('myOrders')}
                </Link>
                <Link href="/billing/statements" className="text-primary hover:underline flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5" />
                  {t('myStatements')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
