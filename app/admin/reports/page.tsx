'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Users, DollarSign, Cpu, Loader2, RefreshCw, BarChart3 } from 'lucide-react'
import { useAdminReports, useRevenueTrend, useUserTrend, useGpuUsage, useTopUsers } from '@/hooks/use-api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

export default function ReportsPage() {
  const { stats: reportData, loading, refresh } = useAdminReports()
  const { data: revenueTrend, loading: revenueLoading } = useRevenueTrend(30)
  const { data: userTrend, loading: userLoading } = useUserTrend(30)
  const { data: gpuData, loading: gpuLoading } = useGpuUsage()
  const { data: topUsers, loading: topLoading } = useTopUsers(30, 10)

  const stats = [
    { title: '总收入', value: `¥${reportData?.totalRevenue?.toLocaleString() || 0}`, change: `今日新增 ${reportData?.todayOrders || 0} 单`, icon: DollarSign, bgClass: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
    { title: '总用户', value: reportData?.totalUsers?.toLocaleString() || '0', change: `今日 +${reportData?.todayNewUsers || 0}`, icon: Users, bgClass: 'from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
    { title: 'GPU 使用率', value: `${reportData?.gpuUtilization || 0}%`, change: '实时数据', icon: Cpu, bgClass: 'from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
    { title: '活跃实例', value: reportData?.activeInstances?.toLocaleString() || '0', change: '运行中', icon: TrendingUp, bgClass: 'from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
  ]

  // 收入趋势折线图数据
  const revenueChartData = useMemo(() => ({
    labels: revenueTrend.map((d: any) => d.date?.slice(5) || ''),
    datasets: [{
      label: '收入 (¥)',
      data: revenueTrend.map((d: any) => d.amount || 0),
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
    }],
  }), [revenueTrend])

  // 用户增长柱状图数据
  const userChartData = useMemo(() => ({
    labels: userTrend.map((d: any) => d.date?.slice(5) || ''),
    datasets: [{
      label: '新增用户',
      data: userTrend.map((d: any) => d.count || 0),
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [userTrend])

  // GPU 型号分布饼图
  const gpuChartData = useMemo(() => {
    const models = gpuData?.by_model || []
    const colors = [
      'rgba(139, 92, 246, 0.7)', 'rgba(59, 130, 246, 0.7)',
      'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)',
      'rgba(239, 68, 68, 0.7)', 'rgba(236, 72, 153, 0.7)',
    ]
    return {
      labels: models.map((m: any) => m.model || m.gpu_model || 'Unknown'),
      datasets: [{
        data: models.map((m: any) => m.total || m.count || 0),
        backgroundColor: colors.slice(0, models.length),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    }
  }, [gpuData])

  // Top 消费用户横向柱状图
  const topUsersChartData = useMemo(() => ({
    labels: topUsers.slice(0, 8).map((u: any) => u.email?.split('@')[0] || u.nickname || 'User'),
    datasets: [{
      label: '消费金额 (¥)',
      data: topUsers.slice(0, 8).map((u: any) => u.total_consumption || 0),
      backgroundColor: 'rgba(245, 158, 11, 0.6)',
      borderColor: 'rgb(245, 158, 11)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [topUsers])

  const lineOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } } },
  }
  const barOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } } },
  }
  const pieOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' as const, labels: { boxWidth: 14, padding: 12 } } },
  }
  const horizontalBarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } }, y: { grid: { display: false } } },
  }

  const handleRefresh = () => { refresh() }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          数据报表
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className={`bg-gradient-to-br ${item.bgClass}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-3xl font-bold mt-1">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.change}</p>
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

      {/* 图表区域 - 第一行 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              收入趋势（近30天）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              {revenueLoading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : revenueTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
              ) : (
                <Line data={revenueChartData} options={lineOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              用户增长（近30天）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              {userLoading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : userTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
              ) : (
                <Bar data={userChartData} options={barOptions} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 - 第二行 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              GPU 型号分布
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              {gpuLoading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : !gpuData?.by_model?.length ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">暂无GPU数据</div>
              ) : (
                <Pie data={gpuChartData} options={pieOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              消费 Top 用户（近30天）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              {topLoading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : topUsers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">暂无数据</div>
              ) : (
                <Bar data={topUsersChartData} options={horizontalBarOptions} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
