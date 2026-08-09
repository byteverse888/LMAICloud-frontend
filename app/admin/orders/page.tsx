'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { Search, Download, Eye, Loader2, RefreshCw, ShoppingCart, CreditCard, CalendarDays, Receipt, Activity } from 'lucide-react'
import { useAdminOrders, useAdminTransactions, useAdminOrderStats } from '@/hooks/use-api'
import { formatTime, renderBillingDescription } from '@/lib/utils'

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('orders')

  // ── 订单列表：服务端筛选 + 分页 ──
  const [searchInput, setSearchInput] = useState('')
  const [emailQuery, setEmailQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { orders, loading, total, refresh } = useAdminOrders(page, pageSize, undefined, {
    email: emailQuery || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  })
  const { stats, loading: statsLoading } = useAdminOrderStats()

  // ── 计费记录：按量计费流水+订单+充值全量资金流水，独立分页，支持按用户筛选 ──
  const [txPage, setTxPage] = useState(1)
  const [txPageSize, setTxPageSize] = useState(20)
  const [txSearchInput, setTxSearchInput] = useState('')
  const [txEmailQuery, setTxEmailQuery] = useState('')
  const { transactions, loading: txLoading, total: txTotal } = useAdminTransactions(
    txPage, txPageSize, undefined, undefined, txEmailQuery || undefined
  )

  // ── 订单详情弹窗 ──
  const [detailOrder, setDetailOrder] = useState<any>(null)

  // 筛选变化时回到第一页
  const applySearch = () => { setEmailQuery(searchInput.trim()); setPage(1) }
  const applyTxSearch = () => { setTxEmailQuery(txSearchInput.trim()); setTxPage(1) }
  const handleTypeChange = (v: string) => { setTypeFilter(v); setPage(1) }
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1) }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; dotClass: string }> = {
      paid: { label: '已支付', variant: 'success', dotClass: 'bg-emerald-500' },
      success: { label: '已完成', variant: 'success', dotClass: 'bg-emerald-500' },
      pending: { label: '待支付', variant: 'warning', dotClass: 'bg-amber-500' },
      cancelled: { label: '已取消', variant: 'secondary', dotClass: 'bg-gray-400' },
      failed: { label: '已失败', variant: 'destructive', dotClass: 'bg-red-500' },
      refunded: { label: '已退款', variant: 'destructive', dotClass: 'bg-red-500' },
      created: { label: '已创建', variant: 'default', dotClass: 'bg-blue-500' },
    }
    const { label, variant, dotClass } = config[status] || { label: status, variant: 'secondary' as const, dotClass: 'bg-gray-400' }
    return (
      <Badge variant={variant} className="gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {label}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      create: '创建实例', renew: '续费', recharge: '充值', upgrade: '升级',
    }
    return <Badge variant="outline">{config[type] || type}</Badge>
  }

  const getTypeLabel = (type: string) => {
    const config: Record<string, string> = {
      create: '创建实例', renew: '续费', recharge: '充值', upgrade: '升级',
    }
    return config[type] || type
  }

  const txTypeBadge = (type: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' }> = {
      recharge: { label: '充值', variant: 'success' },
      billing: { label: '按量计费', variant: 'default' },
      consumption: { label: '资源订单', variant: 'secondary' },
    }
    const { label, variant } = config[type] || { label: type, variant: 'secondary' as const }
    return <Badge variant={variant}>{label}</Badge>
  }

  const statCards = [
    {
      title: '累计收入', value: `¥${(stats?.total_revenue || 0).toFixed(2)}`,
      subtitle: `成功充值 ${stats?.recharge_orders || 0} 笔`,
      icon: CreditCard, iconClass: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      title: '今日收入', value: `¥${(stats?.today_revenue || 0).toFixed(2)}`,
      subtitle: `今日成功充值（新增订单 ${stats?.today_orders || 0}）`,
      icon: CalendarDays, iconClass: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: '今日消费', value: `¥${(stats?.today_consumption || 0).toFixed(2)}`,
      subtitle: '按量计费今日结算',
      icon: Activity, iconClass: 'bg-orange-500/10 text-orange-500',
    },
    {
      title: '本月收入', value: `¥${(stats?.month_revenue || 0).toFixed(2)}`,
      subtitle: '成功充值金额',
      icon: Receipt, iconClass: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: '订单总数', value: `${stats?.total_orders || 0}`,
      subtitle: '已创建资源订单',
      icon: ShoppingCart, iconClass: 'bg-amber-500/10 text-amber-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            刷新
          </Button>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />导出</Button>
        </div>
      </div>

      {/* 统计卡片：收入口径=成功充值；今日消费为按量计费结算（消费口径，供运营参考） */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{c.title}</p>
                    <p className="text-xl font-bold">{statsLoading ? '-' : c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs：订单列表（消费+充值合并，类型下拉筛选）+ 计费记录（含按量计费流水） */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">订单列表</TabsTrigger>
          <TabsTrigger value="transactions">计费记录</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {/* 筛选区域（服务端筛选） */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户邮箱，回车查询..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applySearch() }}
              />
            </div>
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="consumption">资源订单</SelectItem>
                <SelectItem value="recharge">充值订单</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="paid">已支付</SelectItem>
                <SelectItem value="pending">待支付</SelectItem>
                <SelectItem value="refunded">已退款</SelectItem>
              </SelectContent>
            </Select>
            {emailQuery && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setEmailQuery(''); setPage(1) }}>
                清除筛选
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id}</TableCell>
                        <TableCell>{order.user_email || '-'}</TableCell>
                        <TableCell>{getTypeBadge(order.type)}</TableCell>
                        <TableCell>{order.product_name || order.description || '-'}</TableCell>
                        {/* 资源订单为创建资源（从余额扣款），不展示金额；仅充值订单展示入账金额 */}
                        <TableCell className="font-medium">
                          {order.type === 'recharge' ? `¥${Number(order.amount || 0).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {order.type === 'recharge' ? getStatusBadge(order.status) : getStatusBadge('created')}
                        </TableCell>
                        <TableCell className="text-sm">{formatTime(order.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setDetailOrder(order)}>
                            <Eye className="h-4 w-4 mr-1" />详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="px-4 py-3 border-t">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* 用户筛选（服务端模糊匹配邮箱） */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="按用户邮箱筛选，回车查询..."
                className="pl-9"
                value={txSearchInput}
                onChange={(e) => setTxSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyTxSearch() }}
              />
            </div>
            {txEmailQuery && (
              <Button variant="ghost" size="sm" onClick={() => { setTxSearchInput(''); setTxEmailQuery(''); setTxPage(1) }}>
                清除筛选
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>流水ID</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        暂无计费记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx: any) => (
                      <TableRow key={`${tx.type}-${tx.id}`}>
                        <TableCell className="font-mono text-sm">{tx.id}</TableCell>
                        <TableCell>{tx.user_email || '-'}</TableCell>
                        <TableCell>{txTypeBadge(tx.type)}</TableCell>
                        <TableCell>{renderBillingDescription(tx.description, tx.period_start, tx.period_end)}</TableCell>
                        <TableCell className={`font-medium ${tx.type === 'recharge' ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {tx.type === 'recharge' ? '+' : '-'}¥{Math.abs(Number(tx.amount || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">{formatTime(tx.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="px-4 py-3 border-t">
                <Pagination
                  page={txPage}
                  pageSize={txPageSize}
                  total={txTotal}
                  onPageChange={setTxPage}
                  onPageSizeChange={(s) => { setTxPageSize(s); setTxPage(1) }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 订单详情弹窗 */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => { if (!open) setDetailOrder(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-3 text-sm">
              {[
                ['订单号', <span key="id" className="font-mono break-all">{detailOrder.id}</span>],
                ['用户', detailOrder.user_email || '-'],
                ['类型', getTypeLabel(detailOrder.type)],
                ['商品', detailOrder.product_name || '-'],
                ['描述', detailOrder.description || '-'],
                ['金额', detailOrder.type === 'recharge'
                  ? <span key="amt" className="font-medium text-emerald-600">+¥{Number(detailOrder.amount || 0).toFixed(2)}</span>
                  : '-（创建资源，从余额扣款）'],
                ['状态', getStatusBadge(detailOrder.type === 'recharge' ? detailOrder.status : 'created')],
                ['创建时间', formatTime(detailOrder.created_at)],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-start gap-3 py-1.5 border-b border-dashed last:border-0">
                  <span className="w-20 shrink-0 text-muted-foreground">{label as string}</span>
                  <span className="flex-1 break-all">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
