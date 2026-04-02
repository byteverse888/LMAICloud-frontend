'use client'

import { useState } from 'react'
import { Download, FileText, TrendingUp, TrendingDown, Calendar, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStatements, useBalance } from '@/hooks/use-api'

export default function StatementsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { statements, loading, summary } = useStatements(year)
  const { balance } = useBalance()

  const totalIncome = summary?.total_recharge ?? statements.reduce((acc: number, s: any) => acc + (s.recharge || 0), 0)
  const totalExpense = summary?.total_consumption ?? statements.reduce((acc: number, s: any) => acc + (s.consumption || 0), 0)

  const yearOptions = []
  for (let y = currentYear; y >= currentYear - 3; y--) {
    yearOptions.push(y)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">账单</h1>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-clean">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">总充值</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">¥{totalIncome.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/8 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-clean">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">总支出</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">¥{totalExpense.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-500/8 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-clean">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">当前余额</p>
                <p className="text-2xl font-bold">¥{balance.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-clean overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>账期</TableHead>
                <TableHead className="text-right">充值</TableHead>
                <TableHead className="text-right">支出</TableHead>
                <TableHead className="text-right">期末余额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    暂无账单数据
                  </TableCell>
                </TableRow>
              ) : (
                statements.map((item: any, index: number) => {
                  const currentMonth = new Date().getMonth() + 1
                  const isCurrentMonth = item.year === currentYear && item.month === currentMonth
                  return (
                    <TableRow key={`${item.year}-${item.month}`} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {item.year}年{item.month}月
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-emerald-500 font-medium">+¥{(item.recharge || 0).toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-orange-500 font-medium">-¥{(item.consumption || 0).toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">¥{(item.net || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={isCurrentMonth ? 'default' : 'secondary'}
                          className={isCurrentMonth ? 'bg-primary' : 'bg-muted'}
                        >
                          {isCurrentMonth ? '未结算' : '已结算'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                          <Download className="h-4 w-4 mr-1" />
                          下载
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
