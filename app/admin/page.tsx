'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminDashboard } from '@/hooks/use-api'
import {
  Server,
  HardDrive,
  Users,
  Cpu,
  Activity,
  DollarSign,
  TrendingUp,
  Loader2,
  Bot,
} from 'lucide-react'

export default function AdminDashboard() {
  const { stats, loading } = useAdminDashboard()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const s = stats || {
    clusters: 0, nodes: 0, users: 0, instances: 0,
    gpu_total: 0, gpu_used: 0, today_revenue: 0, month_revenue: 0, activities: [],
  }

  const statCards = [
    { title: '集群数量', value: s.clusters, icon: Server, color: 'text-blue-500' },
    { title: '节点总数', value: s.nodes, icon: HardDrive, color: 'text-green-500' },
    { title: '注册用户', value: (s.users || 0).toLocaleString(), icon: Users, color: 'text-purple-500' },
    { title: '运行实例', value: (s.running_instances || s.instances || 0).toLocaleString(), icon: Cpu, color: 'text-amber-500' },
    { title: '智能体实例', value: `${s.oc_running || 0} / ${s.oc_total || 0}`, icon: Bot, color: 'text-violet-500' },
  ]

  const gpuTotal = s.gpu_total || 1
  const gpuUsed = s.gpu_used || 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${item.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* GPU 使用情况 & 收入统计 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              GPU 使用情况
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">总 GPU 数量</span>
                <span className="font-medium">{gpuTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">已使用</span>
                <span className="font-medium text-green-500">{gpuUsed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">空闲</span>
                <span className="font-medium">{gpuTotal - gpuUsed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">使用率</span>
                <span className="font-medium">
                  {((gpuUsed / gpuTotal) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(gpuUsed / gpuTotal) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              收入统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">今日收入</span>
                <span className="font-medium text-green-500">
                  ¥{(s.today_revenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">本月收入</span>
                <span className="font-medium text-green-500">
                  ¥{(s.month_revenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">今日新增用户</span>
                <span className="font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {s.today_new_users || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(s.activities || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无活动记录</p>
            ) : (
              (s.activities || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground w-16">{item.time}</span>
                  <span>{item.event}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
