'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Search, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

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
  { value: 'all', label: '请选择产品名称' },
  { value: 'instance', label: '容器实例' },
  { value: 'storage', label: '文件存储' },
  { value: 'image', label: '镜像' },
  { value: 'disk', label: '数据盘扩容' },
]

export default function OrdersPage() {
  const t = useTranslations('billing')
  const [orderId, setOrderId] = useState('')
  const [productType, setProductType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { orders, loading, total, refresh } = useOrders(currentPage, pageSize)
  const totalPages = Math.ceil(total / pageSize)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
            已支付
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></span>
            待结算
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            已取消
          </span>
        )
      default:
        return status
    }
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
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                开始时间
              </Button>
              <span className="text-muted-foreground">至</span>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                结束时间
              </Button>
            </div>

            <Button size="sm" className="gap-1">
              <Search className="h-4 w-4" />
              搜索
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
                <TableHead className="w-[80px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.id}</TableCell>
                  <TableCell className="text-sm">{order.created_at}</TableCell>
                  <TableCell className="text-sm">{order.product_name || '-'}</TableCell>
                  <TableCell className="text-sm">{order.billing_type || '按量计费'}</TableCell>
                  <TableCell className="text-sm">{order.order_type || '-'}</TableCell>
                  <TableCell className="text-sm">{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    {order.amount !== null && order.amount !== undefined ? (
                      <span className={cn(
                        'text-sm',
                        order.status === 'paid' ? 'text-green-600' : ''
                      )}>
                        ¥{Number(order.amount).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.status === 'paid' && (
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        查看详情
                      </Button>
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
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-primary font-medium px-2">{currentPage}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
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
                defaultValue={1}
              />
              <span className="text-sm text-muted-foreground">页</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
