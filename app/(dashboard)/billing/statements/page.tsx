'use client'

import { Download, FileText, TrendingUp, TrendingDown, Calendar, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const statements = [
  { id: '1', period: '2024年2月', income: 0, expense: 156.89, balance: 156.05, status: '未结算' },
  { id: '2', period: '2024年1月', income: 500.00, expense: 423.56, balance: 312.94, status: '已结算' },
  { id: '3', period: '2023年12月', income: 200.00, expense: 186.50, balance: 236.50, status: '已结算' },
  { id: '4', period: '2023年11月', income: 300.00, expense: 277.00, balance: 223.00, status: '已结算' },
]

export default function StatementsPage() {
  const totalIncome = statements.reduce((acc, s) => acc + s.income, 0)
  const totalExpense = statements.reduce((acc, s) => acc + s.expense, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">账单</h1>
        <Select defaultValue="2024">
          <SelectTrigger className="w-32">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024年</SelectItem>
            <SelectItem value="2023">2023年</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总收入</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">¥{totalIncome.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总支出</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">¥{totalExpense.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">当前余额</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">¥{statements[0]?.balance.toFixed(2) || '0.00'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>账期</TableHead>
                <TableHead className="text-right">收入</TableHead>
                <TableHead className="text-right">支出</TableHead>
                <TableHead className="text-right">期末余额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {item.period}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-emerald-500 font-medium">+¥{item.income.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-orange-500 font-medium">-¥{item.expense.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">¥{item.balance.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={item.status === '已结算' ? 'secondary' : 'default'}
                      className={item.status === '已结算' ? 'bg-muted' : 'bg-primary'}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
