'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Search, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useOrders } from '@/hooks/use-api'

const productOptions = [
  { value: 'all', label: '全部产品' },
  { value: 'instance', label: '容器实例' },
  { value: 'openclaw', label: 'OpenClaw' },
  { value: 'storage', label: '文件存储' },
  { value: 'image', label: '镜像' },
  { value: 'disk', label: '数据盘扩容' },
]

export default function OrdersPage() {
  const t = useTranslations('billing')
  const [orderId, setOrderId] = useState('')
  const [productType, setProductType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [goToPage, setGoToPage] = useState('')

  // 搜索触发：只有点击搜索时才更新 appliedFilters
  const [appliedFilters, setAppliedFilters] = useState<{
    search?: string; product_name?: string; start_date?: string; end_date?: string
  }>({})

  const { orders, loading, total, refresh } = useOrders(currentPage, pageSize, appliedFilters)
  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = () => {
    setCurrentPage(1)
    setAppliedFilters({
      search: orderId || undefined,
      product_name: productType !== 'all' ? productType : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })
  }

  const handleReset = () => {
    setOrderId('')
    setProductType('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
    setAppliedFilters({})
  }

  const handleGoToPage = () => {
    const p = parseInt(goToPage)
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p)
    }
    setGoToPage('')
  }

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { cls: string; label: string }> = {
      paid:      { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label: '已支付' },
      pending:   { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',   label: '待结算' },
      cancelled: { cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',           label: '已取消' },
    }
    const c = cfg[status] || { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400', label: status }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>
        {c.label}
      </span>
    )
  }

  const getOrderTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      create: '创建',
      renew: '续费',
      upgrade: '升级',
      recharge: '充值',
    }
    return map[type] || type || '-'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">我的订单</h1>

      {/* 筛选区域 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 订单号 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">订单号：</span>
              <Input
                placeholder="请输入订单号"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-48"
              />
            </div>

            {/* 产品名称 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">产品名称：</span>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="请选择产品名称" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 交易时间 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">交易时间：</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <span className="text-muted-foreground">至</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
            </div>

            <Button size="sm" className="gap-1" onClick={handleSearch}>
              <Search className="h-4 w-4" />
              搜索
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleReset}>
              <X className="h-4 w-4" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">订单号</TableHead>
                <TableHead className="w-[160px]">订单创建时间</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead className="w-[100px]">计费方式</TableHead>
                <TableHead className="w-[120px]">订单类型</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[100px] text-right">金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无订单数据
                  </TableCell>
                </TableRow>
              )}
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id}</TableCell>
                  <TableCell className="text-sm">
                    {order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{order.product_name || order.description || '-'}</TableCell>
                  <TableCell className="text-sm">
                    {order.billing_cycle === 'monthly' ? '包月' :
                     order.billing_cycle === 'yearly' ? '包年' :
                     order.billing_cycle === 'daily' ? '按天' : '按量计费'}
                  </TableCell>
                  <TableCell className="text-sm">{getOrderTypeLabel(order.type)}</TableCell>
                  <TableCell className="text-sm">{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    {order.amount !== null && order.amount !== undefined ? (
                      <span className={cn(
                        'text-sm font-medium',
                        Number(order.amount) > 0 ? 'text-orange-500' : ''
                      )}>
                        ¥{Math.abs(Number(order.amount)).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 加载状态 */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {/* 分页 */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              共 {total} 条
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-primary font-medium px-2">
                {currentPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10条/页</SelectItem>
                  <SelectItem value="20">20条/页</SelectItem>
                  <SelectItem value="50">50条/页</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">前往</span>
              <Input
                type="number"
                className="w-16 h-8"
                min={1}
                max={totalPages}
                value={goToPage}
                onChange={(e) => setGoToPage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              />
              <span className="text-sm text-muted-foreground">页</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
