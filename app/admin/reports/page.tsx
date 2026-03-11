'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, TrendingUp, Users, DollarSign, Cpu, Loader2, RefreshCw, BarChart3, ArrowUpRight } from 'lucide-react'
import { useAdminReports } from '@/hooks/use-api'

export default function ReportsPage() {
  const { stats: reportData, loading, refresh } = useAdminReports()
  
  const stats = [
    { title: '总收入', value: `¥${reportData?.totalRevenue?.toLocaleString() || 0}`, change: '+12.5%', icon: DollarSign, color: 'emerald', bgClass: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
    { title: '新增用户', value: reportData?.totalUsers?.toLocaleString() || '0', change: '+8.2%', icon: Users, color: 'blue', bgClass: 'from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
    { title: 'GPU 使用率', value: `${reportData?.gpuUtilization || 0}%`, change: '+15.3%', icon: Cpu, color: 'purple', bgClass: 'from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
    { title: '活跃实例', value: reportData?.activeInstances?.toLocaleString() || '0', change: '+5.1%', icon: TrendingUp, color: 'amber', bgClass: 'from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          数据报表
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Select defaultValue="month">
            <SelectTrigger className="w-32 bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">今日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="year">本年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />导出报表</Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className={`stat-card bg-gradient-to-br ${item.bgClass} border-${item.color}-200/50 dark:border-${item.color}-800/50 hover-lift`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-3xl font-bold mt-1">{item.value}</p>
                    <p className="text-sm text-emerald-500 mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {item.change}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              收入趋势
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                收入折线图
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              用户增长
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                用户增长柱状图
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              GPU 型号分布
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                GPU 饼图
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              地区分布
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                地区热力图
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
