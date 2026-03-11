'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Server,
  PlayCircle,
  Clock,
  AlertTriangle,
  HardDrive,
  Layers,
  FolderOpen,
  HelpCircle,
  ExternalLink,
  Edit,
  CreditCard,
  Ticket,
  Gift,
  BadgeCheck,
  Loader2,
  Cpu,
  Zap,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useInstances, useBalance, useStorage } from '@/hooks/use-api'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const { instances, loading: instancesLoading } = useInstances()
  const { balance, loading: balanceLoading } = useBalance()
  const { storages, loading: storageLoading } = useStorage()

  // 计算统计数据
  const stats = {
    instances: {
      total: instances.length,
      running: instances.filter(i => i.status === 'running').length,
      expiring: 0,
      releasing: 0,
    },
    data: {
      instanceDisk: storages.reduce((acc, s) => acc + s.size_gb, 0),
      imageCapacity: 0,
      fileStorage: storages.reduce((acc, s) => acc + s.used_gb, 0),
    },
    balance: {
      available: balance,
      frozen: 0,
      coupon: 0,
      voucher: 0,
    },
    user: {
      nickname: '炼丹师5325',
      verified: false,
      level: '普通用户',
      growthValue: 0,
      maxGrowth: 100,
    },
  }

  const loading = instancesLoading || balanceLoading || storageLoading

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">
          {t('title')}
        </h1>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* 快捷统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50 hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">实例总数</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.instances.total}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
                <Server className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200/50 dark:border-emerald-800/50 hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">运行中</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.instances.running}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-emerald-500 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50 hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">即将到期</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.instances.expiring}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200/50 dark:border-purple-800/50 hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">账户余额</p>
                <p className={`text-3xl font-bold ${stats.balance.available < 0 ? 'text-red-500' : 'text-purple-600 dark:text-purple-400'}`}>
                  ¥{stats.balance.available.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧主内容区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 实例统计卡片 */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                {t('instances')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('containerInstances')}</div>
                  <div className="text-2xl font-bold text-primary">{stats.instances.total}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('running')}</div>
                  <div className="text-2xl font-bold text-emerald-500">{stats.instances.running}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    {t('expiring')} <HelpCircle className="h-3 w-3" />
                  </div>
                  <div className="text-2xl font-bold text-amber-500">{stats.instances.expiring}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    {t('releasing')} <HelpCircle className="h-3 w-3" />
                  </div>
                  <div className="text-2xl font-bold text-red-500">{stats.instances.releasing}</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('expiryWarning')}</span>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  <Switch />
                  <span className="text-muted-foreground">已开启</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('balanceWarning')}</span>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  <Switch defaultChecked />
                  <span className="text-muted-foreground">已开启</span>
                </div>
                <Link href="#" className="text-primary hover:underline">
                  {t('sendRecords')}
                </Link>
                <span className="text-muted-foreground text-xs">(余额不足10元预警)</span>
                <Link href="#" className="text-primary hover:underline">
                  {t('bindEmail')}
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 数据统计卡片 */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/5 to-transparent">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-blue-500" />
                {t('data')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('instanceDataDisk')}</div>
                  <div className="text-xs text-muted-foreground">{t('paidExpansion')}</div>
                  <div className="text-2xl font-bold">
                    {stats.data.instanceDisk}
                    <span className="text-sm font-normal text-muted-foreground">GB</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('imageCapacity')}</div>
                  <div className="text-xs text-muted-foreground">{t('paidCapacity')}</div>
                  <div className="text-2xl font-bold">
                    {stats.data.imageCapacity}
                    <span className="text-sm font-normal text-muted-foreground">GB</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('fileStorage')}</div>
                  <div className="text-xs text-muted-foreground">{t('paidCapacity')}</div>
                  <div className="text-2xl font-bold">
                    {stats.data.fileStorage}
                    <span className="text-sm font-normal text-muted-foreground">GB</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 常见问题 */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/5 to-transparent">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-amber-500" />
                {t('faq')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  href="#"
                  className="flex items-center text-sm text-muted-foreground hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t('howToChooseGpu')}
                </Link>
                <Link
                  href="#"
                  className="flex items-center text-sm text-muted-foreground hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t('howToUploadData')}
                </Link>
                <Link
                  href="#"
                  className="flex items-center text-sm text-muted-foreground hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t('howToInvoice')}
                </Link>
                <Link
                  href="#"
                  className="flex items-center text-sm text-muted-foreground hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t('howToBecomeMember')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-6">
          {/* 用户信息 */}
          <Card className="overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
            <CardContent className="pt-0 relative">
              <div className="-mt-8 mb-4">
                <div className="h-16 w-16 rounded-full bg-background border-4 border-background flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-primary">炼</span>
                </div>
              </div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.user.nickname}</span>
                  <Link href="/account" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  {!stats.user.verified && (
                    <span className="px-2 py-0.5 text-xs border border-amber-500 text-amber-500 rounded">
                      {t('notVerified')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <BadgeCheck className="h-4 w-4" />
                {t('normalUser')}
              </div>
              <Link href="#" className="text-sm text-primary hover:underline block mb-1">
                {t('upgradeMember')}
              </Link>
              <Link href="#" className="text-sm text-primary hover:underline block mb-4">
                {t('memberBenefits')}
              </Link>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('growthValue')}</span>
                  <span>
                    {stats.user.growthValue}/{stats.user.maxGrowth}
                  </span>
                </div>
                <Progress value={(stats.user.growthValue / stats.user.maxGrowth) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  距离升级还需{stats.user.maxGrowth - stats.user.growthValue}成长值{' '}
                  <Link href="#" className="text-primary hover:underline">
                    {t('upgradeGuide')}
                  </Link>
                </div>
                <Link href="#" className="text-sm text-primary hover:underline block">
                  {t('growthPage')} &gt;
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 费用信息 */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-red-500/5 to-transparent">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-500" />
                {t('balanceInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">{t('myBalance')}</span>
                <Button size="sm" className="bg-red-500 hover:bg-red-600">
                  {t('recharge')}
                </Button>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <span className="text-sm text-muted-foreground">{t('available')}：</span>
                  <span className={`text-xl font-bold ${stats.balance.available < 0 ? 'text-red-500' : ''}`}>
                    ¥{stats.balance.available.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('frozen')}：</span>
                  <span className="text-xl font-bold">¥{stats.balance.frozen.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-amber-500" />
                  <span>{t('coupon')}</span>
                  <span className="ml-auto">¥{stats.balance.coupon.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-red-500" />
                  <span>{t('voucher')}</span>
                  <span className="ml-auto">{t('none')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span>{t('credit')}</span>
                  <span className="ml-auto">
                    {t('none')}{' '}
                    <Link href="#" className="text-primary hover:underline">
                      {t('applyCredit')}
                    </Link>
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-sm">
                <Link href="/billing/orders" className="text-primary hover:underline">
                  {t('myOrders')} &gt;
                </Link>
                <Link href="/billing/statements" className="text-primary hover:underline">
                  {t('myStatements')} &gt;
                </Link>
                <Link href="/billing/coupons" className="text-primary hover:underline">
                  {t('myCoupons')} &gt;
                </Link>
                <Link href="/billing/invoices" className="text-primary hover:underline">
                  {t('invoiceManagement')} &gt;
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
