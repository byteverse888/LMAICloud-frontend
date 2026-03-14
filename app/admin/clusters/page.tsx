'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import {
  Server, RefreshCw, Loader2, Activity, Cpu, MemoryStick,
  HardDrive, CheckCircle2, XCircle, AlertTriangle, Info,
  Layers, Box, Globe, Shield,
} from 'lucide-react'
import {
  useClusterOverview, useClusterHealth, useClusterNodeMetrics, useClusterEvents,
} from '@/hooks/use-api'

// 格式化字节
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'Ki', 'Mi', 'Gi', 'Ti']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(1)} ${units[i]}`
}

// 格式化 millicores 为核数
function formatCpu(mc: number): string {
  if (mc >= 1000) return `${(mc / 1000).toFixed(1)} 核`
  return `${mc}m`
}

// 进度条颜色
function progressColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export default function ClustersPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const { overview, loading: overviewLoading, refresh: refreshOverview } = useClusterOverview()
  const { health, loading: healthLoading, refresh: refreshHealth } = useClusterHealth()
  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useClusterNodeMetrics()
  const { events, loading: eventsLoading, refresh: refreshEvents } = useClusterEvents()

  const allLoading = overviewLoading || healthLoading || metricsLoading
  const refreshAll = () => { refreshOverview(); refreshHealth(); refreshMetrics(); refreshEvents() }

  // 健康状态图标
  const healthIcon = (status: string) => {
    if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />
    if (status === 'degraded') return <AlertTriangle className="h-4 w-4 text-amber-500" />
    return <Info className="h-4 w-4 text-muted-foreground" />
  }

  // 整体健康状态标签
  const overallHealthBadge = () => {
    if (!health) return <Badge variant="secondary">检查中...</Badge>
    const s = health.status
    if (s === 'ok') return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> 健康</Badge>
    if (s === 'degraded') return <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1"><AlertTriangle className="h-3 w-3" /> 降级</Badge>
    if (s === 'unhealthy') return <Badge className="bg-red-500 hover:bg-red-600 text-white gap-1"><XCircle className="h-3 w-3" /> 异常</Badge>
    return <Badge variant="secondary" className="gap-1"><Info className="h-3 w-3" /> 未知</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" />
          集群管理
        </h1>
        <div className="flex items-center gap-3">
          {overallHealthBadge()}
          <Button variant="outline" onClick={refreshAll} disabled={allLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${allLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      {overviewLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : overview ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">集群版本</p>
                  <p className="text-lg font-bold mt-1">{overview.version?.git_version || '-'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{overview.version?.platform || ''}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">节点状态</p>
                  <p className="text-lg font-bold mt-1">
                    <span className="text-emerald-500">{overview.nodes?.ready}</span>
                    <span className="text-muted-foreground"> / {overview.nodes?.total}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">就绪 / 总计</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pod 运行</p>
                  <p className="text-lg font-bold mt-1">
                    <span className="text-blue-500">{overview.pods?.running}</span>
                    <span className="text-muted-foreground"> / {overview.pods?.total}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">运行中 / 总计</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Box className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">GPU 资源</p>
                  <p className="text-lg font-bold mt-1">
                    <span className="text-amber-500">{(overview.resources?.gpu_total || 0) - (overview.resources?.gpu_available || 0)}</span>
                    <span className="text-muted-foreground"> / {overview.resources?.gpu_total || 0}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">已用 / 总计</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* 资源汇总条 */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Cpu className="h-3.5 w-3.5" /> CPU 总容量
              </div>
              <p className="text-xl font-bold">{overview.resources?.cpu_capacity_cores || 0} 核</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MemoryStick className="h-3.5 w-3.5" /> 内存总容量
              </div>
              <p className="text-xl font-bold">{overview.resources?.memory_capacity_gb || 0} GB</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Layers className="h-3.5 w-3.5" /> 命名空间
              </div>
              <p className="text-xl font-bold">{overview.namespaces || 0} 个</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
          <TabsTrigger
            value="overview"
            className="gap-2 px-4 py-2 rounded-md text-slate-600 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all"
          >
            <Activity className="h-4 w-4" />
            节点负载
          </TabsTrigger>
          <TabsTrigger
            value="health"
            className="gap-2 px-4 py-2 rounded-md text-slate-600 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all"
          >
            <Shield className="h-4 w-4" />
            健康检查
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="gap-2 px-4 py-2 rounded-md text-slate-600 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all"
          >
            <AlertTriangle className="h-4 w-4" />
            告警事件
            {events.length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">{events.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 节点负载 Tab */}
        <TabsContent value="overview" className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                节点资源使用 (Top Node)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {metricsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : metrics.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无指标数据</p>
                  <p className="text-xs mt-1">请确认集群已安装 Metrics Server</p>
                </div>
              ) : (
                <Table className="table-enhanced">
                  <TableHeader>
                    <TableRow>
                      <TableHead>节点名称</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>CPU 使用</TableHead>
                      <TableHead className="w-[200px]">CPU 使用率</TableHead>
                      <TableHead>内存使用</TableHead>
                      <TableHead className="w-[200px]">内存使用率</TableHead>
                      <TableHead>GPU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m: any) => (
                      <TableRow key={m.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm" title={m.name}>
                              {m.name.length > 30 ? `${m.name.slice(0, 16)}...${m.name.slice(-12)}` : m.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.status === 'Ready' ? 'success' : 'destructive'}
                            className="gap-1"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'Ready' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {m.status === 'Ready' ? '就绪' : '异常'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">
                            {formatCpu(m.cpu_usage_millicores)} / {formatCpu(m.cpu_capacity_millicores)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressColor(m.cpu_percent)}`}
                                style={{ width: `${Math.min(m.cpu_percent, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-10 text-right ${m.cpu_percent >= 90 ? 'text-red-500' : m.cpu_percent >= 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {m.cpu_percent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">
                            {formatBytes(m.memory_usage_bytes)} / {formatBytes(m.memory_capacity_bytes)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressColor(m.memory_percent)}`}
                                style={{ width: `${Math.min(m.memory_percent, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-10 text-right ${m.memory_percent >= 90 ? 'text-red-500' : m.memory_percent >= 70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {m.memory_percent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.gpu_count > 0 ? (
                            <span className="text-sm">
                              <span className="text-emerald-500 font-medium">{m.gpu_allocatable}</span>
                              <span className="text-muted-foreground"> / {m.gpu_count}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 健康检查 Tab */}
        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                集群健康检查 (Readyz)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !health || health.checks?.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无健康检查数据</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {health.checks
                    .filter((c: any) => c.name !== '_summary')
                    .map((check: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        check.status === 'ok'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20'
                          : 'bg-red-50 dark:bg-red-950/20'
                      }`}
                    >
                      {healthIcon(check.status)}
                      <span className="font-mono text-xs flex-1">{check.message}</span>
                    </div>
                  ))}
                  {/* 汇总行 */}
                  {health.checks.find((c: any) => c.name === '_summary') && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      {healthIcon(health.status)}
                      <span className="text-sm font-medium">
                        {health.checks.find((c: any) => c.name === '_summary')?.message}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警事件 Tab */}
        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                集群 Warning 事件
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {eventsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-70" />
                  <p>暂无告警事件</p>
                </div>
              ) : (
                <Table className="table-enhanced">
                  <TableHeader>
                    <TableRow>
                      <TableHead>命名空间</TableHead>
                      <TableHead>资源</TableHead>
                      <TableHead>原因</TableHead>
                      <TableHead className="max-w-[400px]">消息</TableHead>
                      <TableHead>次数</TableHead>
                      <TableHead>最近发生</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.slice(0, 50).map((evt: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">{evt.namespace}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-muted-foreground">{evt.kind}/</span>
                            <span className="font-medium" title={evt.name}>
                              {evt.name?.length > 30 ? `${evt.name.slice(0, 20)}...` : evt.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 text-xs">
                            {evt.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[400px]">
                          <p className="text-xs text-muted-foreground truncate" title={evt.message}>
                            {evt.message}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{evt.count}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {evt.last_timestamp ? new Date(evt.last_timestamp).toLocaleString('zh-CN') : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
