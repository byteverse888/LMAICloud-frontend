'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Download, Eye, Loader2, RefreshCw, ShoppingCart, CreditCard, ArrowUpDown, FileText } from 'lucide-react'
import { useAdminOrders, useAdminTransactions, useAdminStatements, useAdminOrderStats } from '@/hooks/use-api'

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('orders')

  const { orders, loading, total, refresh } = useAdminOrders(page, 20)
  const { transactions, loading: txLoading } = useAdminTransactions(1, 50)
  const { statements, loading: stLoading } = useAdminStatements()
  const { stats, loading: statsLoading } = useAdminOrderStats()

  // 前端筛选（email搜索 + 状态筛选）
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = !searchQuery ||
      order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const consumptionOrders = filteredOrders.filter((o: any) => o.type !== 'recharge')
  const rechargeOrders = filteredOrders.filter((o: any) => o.type === 'recharge')

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; dotClass: string }> = {
      paid: { label: '已支付', variant: 'success', dotClass: 'bg-emerald-500' },
      success: { label: '已完成', variant: 'success', dotClass: 'bg-emerald-500' },
      pending: { label: '待支付', variant: 'warning', dotClass: 'bg-amber-500' },
      cancelled: { label: '已取消', variant: 'secondary', dotClass: 'bg-gray-400' },
      failed: { label: '已失败', variant: 'destructive', dotClass: 'bg-red-500' },
      refunded: { label: '已退款', variant: 'destructive', dotClass: 'bg-red-500' },
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

  const OrderTable = ({ data }: { data: any[] }) => (
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
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
              暂无数据
            </TableCell>
          </TableRow>
        ) : (
          data.map((order: any) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-sm">{order.id}</TableCell>
              <TableCell>{order.user_email || '-'}</TableCell>
              <TableCell>{getTypeBadge(order.type)}</TableCell>
              <TableCell>{order.product_name || order.description || '-'}</TableCell>
              <TableCell className="font-medium">¥{Number(order.amount || 0).toFixed(2)}</TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell className="text-sm">{order.created_at}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" />详情</Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )

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

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总消费</p>
                <p className="text-xl font-bold">¥{(stats?.total_consumption || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总充值</p>
                <p className="text-xl font-bold">¥{(stats?.total_recharge || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ArrowUpDown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">订单数</p>
                <p className="text-xl font-bold">{stats?.consumption_orders || total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">充值数</p>
                <p className="text-xl font-bold">{stats?.recharge_orders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选区域 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索订单号/用户邮箱..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="paid">已支付</SelectItem>
            <SelectItem value="pending">待支付</SelectItem>
            <SelectItem value="refunded">已退款</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs 切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">全部订单</TabsTrigger>
          <TabsTrigger value="consumption">消费订单</TabsTrigger>
          <TabsTrigger value="recharge">充值订单</TabsTrigger>
          <TabsTrigger value="transactions">交易流水</TabsTrigger>
          <TabsTrigger value="statements">账单统计</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0">
              <OrderTable data={filteredOrders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption">
          <Card>
            <CardContent className="p-0">
              <OrderTable data={consumptionOrders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recharge">
          <Card>
            <CardContent className="p-0">
              <OrderTable data={rechargeOrders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>交易ID</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        暂无交易记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">{tx.id}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'recharge' ? 'default' : 'secondary'}>
                            {tx.type === 'recharge' ? '充值' : '消费'}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.description || tx.product_name || '-'}</TableCell>
                        <TableCell className={`font-medium ${tx.type === 'recharge' ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {tx.type === 'recharge' ? '+' : '-'}¥{Number(tx.amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">{tx.created_at}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statements">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>账期</TableHead>
                    <TableHead className="text-right">充值</TableHead>
                    <TableHead className="text-right">支出</TableHead>
                    <TableHead className="text-right">余额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : statements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        暂无账单数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    statements.map((st: any) => (
                      <TableRow key={`${st.year}-${st.month}`}>
                        <TableCell className="font-medium">{st.year}年{st.month}月</TableCell>
                        <TableCell className="text-right text-emerald-500 font-medium">+¥{(st.recharge || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-orange-500 font-medium">-¥{(st.consumption || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">¥{(st.net || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
