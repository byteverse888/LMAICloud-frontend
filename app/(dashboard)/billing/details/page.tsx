'use client'

import { useState } from 'react'
import { Download, Search, Calendar, Filter, Cpu, HardDrive, Receipt, Loader2, ChevronLeft, ChevronRight, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useTransactions, useBalance } from '@/hooks/use-api'

export default function BillingDetailsPage() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { transactions, loading, total, monthConsumption, totalConsumption } = useTransactions(page, pageSize, typeFilter === 'all' ? undefined : typeFilter)
  const { balance } = useBalance()

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">账单明细</h1>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          导出账单
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-clean">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">本月消费</div>
                <div className="text-2xl font-bold">¥{monthConsumption.toFixed(2)}</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-500/8 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-clean">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">消费总计</div>
                <div className="text-2xl font-bold text-red-500">¥{totalConsumption.toFixed(2)}</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/8 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-clean">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">当前余额</div>
                <div className="text-2xl font-bold text-primary">¥{balance.toFixed(2)}</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-clean">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">交易笔数</div>
                <div className="text-2xl font-bold">{total}</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card className="card-clean">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={typeFilter || 'all'} onValueChange={(v) => { setTypeFilter(v === 'all' ? undefined : v); setPage(1) }}>
              <SelectTrigger className="w-32 bg-background">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="consumption">消费</SelectItem>
                <SelectItem value="recharge">充值</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 明细表格 */}
      <Card className="card-clean overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无交易记录</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">{new Date(item.created_at).toLocaleString('zh-CN')}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          item.type === 'recharge'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                        }
                      >
                        {item.type === 'recharge' ? '充值' : '消费'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.description || '-'}</TableCell>
                    <TableCell className={`text-right font-semibold ${item.amount > 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {item.amount > 0 ? '+' : ''}¥{Math.abs(item.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 条记录</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center text-sm px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
