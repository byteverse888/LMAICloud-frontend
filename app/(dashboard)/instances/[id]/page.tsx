'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
  Terminal,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  Activity,
  FileText,
  Settings,
  Loader2,
  RefreshCw,
  Save,
  Pencil,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useInstance, useInstanceLogs, useInstanceStatus, useInstanceWebSocket, useInstanceRenew, useInstanceMetrics } from '@/hooks/use-api'
import { useAuthStore } from '@/stores/auth-store'

// 动态加载终端组件（避免SSR问题）
const WebTerminal = dynamic(
  () => import('@/components/terminal/web-terminal'),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> }
)

// 动态加载日志流组件
const LogStream = dynamic(
  () => import('@/components/terminal/log-stream'),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> }
)

export default function InstanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const instanceId = params.id as string
  
  const { token } = useAuthStore()
  const { instance, loading, error, refresh, startInstance, stopInstance, releaseInstance } = useInstance(instanceId)
  const { logs, loading: logsLoading, refresh: refreshLogs } = useInstanceLogs(instanceId)
  const { podStatus } = useInstanceStatus(instanceId)
  const { metrics } = useInstanceMetrics(instanceId)
  const { renewInstance, loading: renewLoading } = useInstanceRenew()
  
  // 跟踪上次状态，避免 WebSocket 首次连接时重复弹出 toast
  const prevStatusRef = useRef<string | null>(null)

  // WebSocket实时状态订阅
  const { connected: wsConnected } = useInstanceWebSocket(instanceId, (status) => {
    if (!status) return
    const prev = prevStatusRef.current
    prevStatusRef.current = status
    // 仅在状态真正发生变化时刷新和提示
    if (prev && prev !== status) {
      refresh()
      if (status === 'running') toast.success('实例已启动')
      else if (status === 'stopped') toast.success('实例已停止')
      else if (status === 'error') toast.error('实例发生异常')
    } else if (!prev) {
      // 首次收到状态，静默刷新
      refresh()
    }
  })
  
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [showRenewDialog, setShowRenewDialog] = useState(false)
  const [renewHours, setRenewHours] = useState(1)


  const handleStart = async () => {
    try {
      await startInstance()
      toast.success('实例启动中')
      setTimeout(refresh, 2000)
    } catch (e) {
      toast.error('启动失败')
    }
  }

  const handleStop = async () => {
    try {
      await stopInstance()
      toast.success('实例已停止')
      setTimeout(refresh, 1000)
    } catch (e) {
      toast.error('停止失败')
    }
  }

  const [restarting, setRestarting] = useState(false)
  const handleRestart = async () => {
    try {
      setRestarting(true)
      await stopInstance()
      // 短暂等待 K8s 确认 replicas=0 后再启动
      await new Promise(r => setTimeout(r, 1500))
      await startInstance()
      toast.success('实例重启中')
      setTimeout(refresh, 2000)
    } catch (e) {
      toast.error('重启失败')
    } finally {
      setRestarting(false)
    }
  }

  const handleRelease = async () => {
    if (!confirm('确定要删除该实例吗？删除后数据将无法恢复。')) return
    try {
      await releaseInstance()
      toast.success('实例删除中')
      setTimeout(() => router.push('/instances'), 1000)
    } catch (e) {
      toast.error('删除失败')
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; dotClass: string }> = {
      running: { label: '运行中', variant: 'success', dotClass: 'bg-emerald-500' },
      stopped: { label: '已停止', variant: 'secondary', dotClass: 'bg-gray-400' },
      creating: { label: '创建中', variant: 'default', dotClass: 'bg-blue-500' },
      starting: { label: '启动中', variant: 'default', dotClass: 'bg-blue-500' },
      stopping: { label: '停止中', variant: 'warning', dotClass: 'bg-amber-500' },
      releasing: { label: '删除中', variant: 'warning', dotClass: 'bg-amber-500' },
      released: { label: '已删除', variant: 'secondary', dotClass: 'bg-gray-400' },
      error: { label: '异常', variant: 'destructive', dotClass: 'bg-red-500' },
    }
    const { label, variant, dotClass } = config[status] || { label: status, variant: 'secondary' as const, dotClass: 'bg-gray-400' }
    const isTransient = ['creating', 'starting', 'stopping', 'releasing'].includes(status)
    const isActive = status === 'running'
    return (
      <Badge variant={variant} className="gap-1.5">
        <span className="relative flex h-2 w-2">
          {(isActive || isTransient) && (
            <span className={`absolute inline-flex h-full w-full rounded-full ${dotClass} ${isTransient ? 'animate-ping' : 'animate-pulse'}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
        </span>
        {label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !instance) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">{error || '实例不存在'}</p>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{instance.name}</h1>
            {getStatusBadge(instance.status)}
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            实例ID: {instance.id} · Deployment: {instance.deployment_name || instance.deployment_info?.name || '-'} · 节点: {instance.node_id || instance.pod_info?.[0]?.node_name || '-'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {instance.status === 'running' ? (
            <>
              <Button variant="outline" onClick={() => setTerminalOpen(true)}>
                <Terminal className="h-4 w-4 mr-2" />
                登录终端
              </Button>
              <Button variant="outline" onClick={handleStop}>
                <PowerOff className="h-4 w-4 mr-2" />
                关机
              </Button>
              <Button variant="outline" onClick={handleRestart} disabled={restarting}>
                {restarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                重启
              </Button>
            </>
          ) : instance.status === 'stopped' ? (
            <Button onClick={handleStart}>
              <Power className="h-4 w-4 mr-2" />
              开机
            </Button>
          ) : null}
          <Button variant="destructive" onClick={handleRelease} disabled={instance.status === 'releasing' || instance.status === 'released'}>
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>
        </div>
      </div>

      {/* 详细信息 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-full">
          <TabsTrigger value="overview" className="rounded-full px-4">概览</TabsTrigger>
          <TabsTrigger value="monitor" className="rounded-full px-4">监控</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-full px-4">日志</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full px-4">设置</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Deployment 运行状态 */}
            <Card className="card-clean">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Deployment 状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deployment</span>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{instance.deployment_info?.name || instance.deployment_name || '-'}</code>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">副本就绪</span>
                  <span className="font-medium">
                    {instance.deployment_info
                      ? `${instance.deployment_info.ready_replicas} / ${instance.deployment_info.replicas}`
                      : instance.ready_replicas != null
                        ? `${instance.ready_replicas} / ${instance.replicas}`
                        : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">镜像</span>
                  <span className="text-sm max-w-[200px] truncate" title={instance.deployment_info?.images?.[0] || instance.image_url || '-'}>
                    {instance.deployment_info?.images?.[0] || instance.image_url || '-'}
                  </span>
                </div>
                {instance.pod_info && instance.pod_info.length > 0 && (
                  <>
                    <Separator />
                    {instance.pod_info.map((pod, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground shrink-0">关联 Pod</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate max-w-[180px]" title={pod.name}>{pod.name}</code>
                          <Badge variant={pod.status === 'Running' ? 'success' : pod.status === 'Pending' ? 'outline' : 'destructive'} className="text-xs shrink-0">
                            {pod.status}
                          </Badge>
                          {pod.restart_count > 0 && <span className="text-xs text-amber-500 shrink-0">重启: {pod.restart_count}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            {/* 配置信息 */}
            <Card className="card-clean">
              <CardHeader>
                <CardTitle className="text-base">配置信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4" /> GPU
                  </span>
                  <span>{instance.gpu_model} × {instance.gpu_count}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4" /> CPU
                  </span>
                  <span>{instance.cpu_cores} 核</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" /> 内存
                  </span>
                  <span>{instance.memory} GB</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <HardDrive className="h-4 w-4" /> 磁盘
                  </span>
                  <span>{instance.disk || '-'} GB</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 费用信息 */}
            <Card className="card-clean">
              <CardHeader>
                <CardTitle className="text-base">费用信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">计费方式</span>
                  <Badge variant="outline">
                    {instance.billing_type === 'hourly' ? '按量计费' : '包时'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">单价</span>
                  <span className="text-red-500 font-medium">¥{instance.hourly_price}/时</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> 创建时间
                  </span>
                  <span className="text-sm">{instance.created_at ? new Date(instance.created_at).toLocaleString() : '-'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">启动时间</span>
                  <span className="text-sm">{instance.started_at ? new Date(instance.started_at).toLocaleString() : '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Conditions */}
            {instance.deployment_info?.conditions && instance.deployment_info.conditions.length > 0 && (
              <Card className="card-clean">
                <CardHeader>
                  <CardTitle className="text-base">Deployment Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {instance.deployment_info.conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={cond.status === 'True' ? 'success' : 'destructive'} className="text-xs">
                          {cond.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{cond.reason || ''}</span>
                      </div>
                      <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={cond.message || ''}>
                        {cond.message || ''}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 监控 */}
        <TabsContent value="monitor" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="stat-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" /> GPU 使用率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>计算</span>
                    <span className="font-medium text-muted-foreground">{metrics?.gpu_util != null ? `${metrics.gpu_util}%` : '需部署 DCGM Exporter'}</span>
                  </div>
                  <Progress value={metrics?.gpu_util ?? 0} className="h-2" />
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span>显存</span>
                    <span className="font-medium text-muted-foreground">{metrics?.gpu_memory != null ? `${metrics.gpu_memory}%` : '需部署 DCGM Exporter'}</span>
                  </div>
                  <Progress value={metrics?.gpu_memory ?? 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> 系统资源
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU</span>
                    <span className="font-medium">
                      {metrics?.cpu_usage_millicores != null
                        ? metrics.cpu_usage_millicores < 1000
                          ? `${metrics.cpu_usage_millicores}m`
                          : `${(metrics.cpu_usage_millicores / 1000).toFixed(1)} 核`
                        : '-'}
                      {instance?.cpu_cores ? ` / ${instance.cpu_cores} 核` : ''}
                    </span>
                  </div>
                  <Progress
                    value={metrics?.cpu_usage_millicores != null && instance?.cpu_cores
                      ? Math.min(100, metrics.cpu_usage_millicores / (instance.cpu_cores * 1000) * 100)
                      : 0}
                    className="h-2"
                  />
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span>内存</span>
                    <span className="font-medium">
                      {metrics?.memory_usage_bytes != null
                        ? metrics.memory_usage_bytes < 1024 * 1024 * 1024
                          ? `${(metrics.memory_usage_bytes / (1024 * 1024)).toFixed(0)} Mi`
                          : `${(metrics.memory_usage_bytes / (1024 * 1024 * 1024)).toFixed(1)} Gi`
                        : '-'}
                      {instance?.memory ? ` / ${instance.memory} Gi` : ''}
                    </span>
                  </div>
                  <Progress
                    value={metrics?.memory_usage_bytes != null && instance?.memory
                      ? Math.min(100, metrics.memory_usage_bytes / (instance.memory * 1024 * 1024 * 1024) * 100)
                      : 0}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="card-clean">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  最后更新: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : '-'}
                </span>
                <Badge variant={instance?.status === 'running' ? 'success' : 'secondary'}>
                  {instance?.status === 'running' ? '实时监控中' : '实例未运行'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
                <p>CPU / 内存数据来源: K8s Metrics Server (kubectl top pod)</p>
                <p>GPU / 磁盘 / 网络等指标需部署 Prometheus + DCGM Exporter 后展示</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 日志 */}
        <TabsContent value="logs">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-base">实例日志</CardTitle>
            </CardHeader>
            <CardContent>
              {token ? (
                <LogStream
                  instanceId={instanceId}
                  token={token}
                  className="h-96"
                />
              ) : (
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-auto">
                  <pre>{logs || '暂无日志'}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 设置 */}
        <TabsContent value="settings">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                实例设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    <HardDrive className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">数据盘扩容</div>
                    <p className="text-sm text-muted-foreground">当前 {instance.disk || '-'} GB</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">扩容</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 终端弹窗 */}
      <Dialog open={terminalOpen} onOpenChange={setTerminalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">WebShell 终端</DialogTitle>
          {terminalOpen && token && (
            <WebTerminal
              instanceId={instanceId}
              token={token}
              instanceName={instance?.name}
              onClose={() => setTerminalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
