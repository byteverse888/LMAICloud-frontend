'use client'

import { useState } from 'react'
import { Download, Search, Calendar, Filter, Cpu, HardDrive, CreditCard, TrendingUp, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const billingDetails = [
  { id: '1', date: '2024-02-13 14:30:25', type: 'GPU实例', instance: 'RTX 4090 x1', duration: '2小时30分', amount: -4.95, balance: 156.05 },
  { id: '2', date: '2024-02-13 10:15:00', type: '数据存储', instance: '50GB SSD', duration: '1天', amount: -0.50, balance: 161.00 },
  { id: '3', date: '2024-02-12 18:00:00', type: '充值', instance: '-', duration: '-', amount: 100.00, balance: 161.50 },
  { id: '4', date: '2024-02-12 09:30:00', type: 'GPU实例', instance: 'RTX 5090 x2', duration: '5小时', amount: -30.30, balance: 61.50 },
  { id: '5', date: '2024-02-11 20:00:00', type: 'GPU实例', instance: 'RTX 4090D x1', duration: '3小时', amount: -5.94, balance: 91.80 },
]

export default function BillingDetailsPage() {
  const [dateRange, setDateRange] = useState('week')
  const [typeFilter, setTypeFilter] = useState('all')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">费用明细</h1>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          导出账单
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">本月消费</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">¥156.89</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">本月充值</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">¥200.00</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">GPU费用</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">¥145.39</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">存储费用</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">¥11.50</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32 bg-background">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">近7天</SelectItem>
                <SelectItem value="month">近30天</SelectItem>
                <SelectItem value="year">近1年</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 bg-background">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="gpu">GPU实例</SelectItem>
                <SelectItem value="storage">数据存储</SelectItem>
                <SelectItem value="recharge">充值</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索..." className="pl-10 bg-background" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 明细表格 */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>时间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>实例/项目</TableHead>
                <TableHead>时长</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead className="text-right">余额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingDetails.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground">{item.date}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={`
                        ${item.type === '充值' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : ''}
                        ${item.type === 'GPU实例' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' : ''}
                        ${item.type === '数据存储' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' : ''}
                      `}
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.instance}</TableCell>
                  <TableCell>{item.duration}</TableCell>
                  <TableCell className={`text-right font-semibold ${item.amount > 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                    {item.amount > 0 ? '+' : ''}¥{Math.abs(item.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">¥{item.balance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
