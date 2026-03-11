'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Server,
  HardDrive,
  Users,
  Cpu,
  Activity,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

export default function AdminDashboard() {
  // 模拟统计数据
  const stats = {
    clusters: 3,
    nodes: 48,
    users: 12580,
    instances: 1256,
    gpuTotal: 384,
    gpuUsed: 298,
    todayRevenue: 28450.5,
    monthRevenue: 856320.8,
    alerts: 2,
  }

  const statCards = [
    { title: '集群数量', value: stats.clusters, icon: Server, color: 'text-blue-500' },
    { title: '节点总数', value: stats.nodes, icon: HardDrive, color: 'text-green-500' },
    { title: '注册用户', value: stats.users.toLocaleString(), icon: Users, color: 'text-purple-500' },
    { title: '运行实例', value: stats.instances.toLocaleString(), icon: Cpu, color: 'text-amber-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* 告警提示 */}
      {stats.alerts > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>当前有 {stats.alerts} 个告警需要处理</span>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <span className="font-medium">{stats.gpuTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">已使用</span>
                <span className="font-medium text-green-500">{stats.gpuUsed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">空闲</span>
                <span className="font-medium">{stats.gpuTotal - stats.gpuUsed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">使用率</span>
                <span className="font-medium">
                  {((stats.gpuUsed / stats.gpuTotal) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(stats.gpuUsed / stats.gpuTotal) * 100}%` }}
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
                  ¥{stats.todayRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">本月收入</span>
                <span className="font-medium text-green-500">
                  ¥{stats.monthRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">环比增长</span>
                <span className="font-medium text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  +12.5%
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
            {[
              { time: '10:30', event: '用户 user123 创建了新实例', type: 'info' },
              { time: '10:25', event: '节点 node-05 上线', type: 'success' },
              { time: '10:20', event: '用户 user456 充值 ¥1000', type: 'info' },
              { time: '10:15', event: '节点 node-12 CPU 使用率超过 90%', type: 'warning' },
              { time: '10:10', event: '用户 user789 释放了实例', type: 'info' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground w-16">{item.time}</span>
                <span
                  className={
                    item.type === 'warning'
                      ? 'text-amber-500'
                      : item.type === 'success'
                      ? 'text-green-500'
                      : ''
                  }
                >
                  {item.event}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
