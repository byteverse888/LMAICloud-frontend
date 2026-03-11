'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Download, Eye, Loader2, RefreshCw } from 'lucide-react'
import { useAdminOrders } from '@/hooks/use-api'

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  
  const { orders, loading, total, refresh } = useAdminOrders(page, 20)
  
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          order.user_email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || order.type === typeFilter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; dotClass: string }> = {
      paid: { label: '已支付', variant: 'success', dotClass: 'bg-emerald-500' },
      pending: { label: '待支付', variant: 'warning', dotClass: 'bg-amber-500' },
      cancelled: { label: '已取消', variant: 'secondary', dotClass: 'bg-gray-400' },
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索订单号/用户..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="create">创建实例</SelectItem>
            <SelectItem value="renew">续费</SelectItem>
            <SelectItem value="recharge">充值</SelectItem>
          </SelectContent>
        </Select>
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
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.id}</TableCell>
                  <TableCell>{order.user_email}</TableCell>
                  <TableCell>{getTypeBadge(order.type)}</TableCell>
                  <TableCell>{order.type}</TableCell>
                  <TableCell className="font-medium">¥{order.amount.toFixed(2)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  )
}
