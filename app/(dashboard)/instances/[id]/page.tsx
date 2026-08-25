'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useInstance, useInstanceLogs, useInstanceStatus, useInstanceWebSocket, useInstanceRenew, useInstanceMetrics } from '@/hooks/use-api'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { formatTime } from '@/lib/utils'
import { StartOptionsDialog } from '@/components/instances/start-options-dialog'

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
  // 关机确认：关机会立即释放算力配额且实例无法迁移节点，属不可逆风险操作，必须二次确认
  const [showStopDialog, setShowStopDialog] = useState(false)
  const [stopping, setStopping] = useState(false)
  // 开机走选项弹窗（与列表页共用组件）：原节点资源被占满时用户可在弹窗里降低本次规格重试
  const [showStartDialog, setShowStartDialog] = useState(false)
  // 调整规格弹窗（关机态预先改规格，不开机，下次开机生效），与开机共用同一组件
  const [showSpecDialog, setShowSpecDialog] = useState(false)



  const handleStop = async () => {
    try {
      setStopping(true)
      await stopInstance()
      toast.success('实例已停止')
      setShowStopDialog(false)
      setTimeout(refresh, 1000)
    } catch (e) {
      toast.error('停止失败')
    } finally {
      setStopping(false)
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
      // 重启是「先停后启」，停机那一瞬配额已释放，若被其他实例抢占则启动会失败、
      // 实例停在已关机状态。具体原因由 api 层按后端 detail 提示，这里只补充实例当前处境
      toast.error('重启失败，实例可能已停机，请稍后重试开机')
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

  const getStatusBadge = (status: string, nodeNotReady = false) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; dotClass: string }> = {
      running: { label: '运行中', variant: 'success', dotClass: 'bg-emerald-500' },
      stopped: { label: '已停止', variant: 'secondary', dotClass: 'bg-gray-400' },
      creating: { label: '创建中', variant: 'default', dotClass: 'bg-blue-500' },
      starting: { label: '启动中', variant: 'default', dotClass: 'bg-blue-500' },
      stopping: { label: '停止中', variant: 'warning', dotClass: 'bg-amber-500' },
      releasing: { label: '删除中', variant: 'warning', dotClass: 'bg-amber-500' },
      released: { label: '已删除', variant: 'secondary', dotClass: 'bg-gray-400' },
      node_offline: { label: '节点离线', variant: 'warning', dotClass: 'bg-orange-500' },
      error: { label: '异常', variant: 'destructive', dotClass: 'bg-red-500' },
    }
    // Pod 仍为 Running/Starting 但所在节点已 NotReady：降级为 warning，
    // 与列表页同口径，避免用户误以为实例正常可用
    const { label, variant, dotClass } = (nodeNotReady && ['running', 'starting'].includes(status))
      ? { label: '节点失联', variant: 'warning' as const, dotClass: 'bg-orange-500' }
      : (config[status] || { label: status, variant: 'secondary' as const, dotClass: 'bg-gray-400' })
    const isTransient = ['creating', 'starting', 'stopping', 'releasing'].includes(status)
    const isActive = status === 'running' && !nodeNotReady
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
            {getStatusBadge(instance.status, instance.node_ready === false)}
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            实例ID: {instance.id} · Deployment: {instance.deployment_name || instance.deployment_info?.name || '-'} · 节点: {instance.node_id || instance.pod_info?.[0]?.node_name || '-'}
          </p>
          {instance.node_ready === false && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
              实例所在节点已离线，WebShell 等容器内操作暂不可用；节点 5 分钟内未恢复，系统将自动挂起该实例（挂起期间不计费）。
            </p>
          )}
          {/* 异常状态下给出具体原因：区分“节点资源不足（可重试/换节点）”与“镜像或配置错（需自改）” */}
          {instance.status === 'error' && instance.last_error && (
            <p className="text-sm text-destructive mt-1">
              {instance.last_error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {instance.status === 'running' ? (
            <>
              <Button variant="outline" onClick={() => setTerminalOpen(true)} disabled={instance.node_ready === false}
                title={instance.node_ready === false ? '所在节点已离线，终端暂不可用' : undefined}>
                <Terminal className="h-4 w-4 mr-2" />
                登录终端
              </Button>
              <Button variant="outline" onClick={() => setShowStopDialog(true)}>
                <PowerOff className="h-4 w-4 mr-2" />
                关机
              </Button>
              <Button variant="outline" onClick={handleRestart} disabled={restarting}>
                {restarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                重启
              </Button>
            </>
          ) : ['stopped', 'error'].includes(instance.status) ? (
            // error 状态同样放行：开机失败落到 error 的实例恰是最需要无卡模式救回数据的场景，
            // 与列表页菜单、后端 start_instance（STOPPED/ERROR/EXPIRED 均放行）口径一致
            <Button onClick={() => setShowStartDialog(true)}>
              <Power className="h-4 w-4 mr-2" />
              开机
            </Button>
          ) : null}
          {/* 调整规格：仅关机态可用（运行中改模板会触发 Pod 重建），其余状态置灰 */}
          <Button variant="outline" onClick={() => setShowSpecDialog(true)}
            disabled={!['stopped', 'error'].includes(instance.status)}
            title={!['stopped', 'error'].includes(instance.status) ? '仅关机状态的实例可调整规格' : undefined}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            调整规格
          </Button>
          <Button variant="destructive" onClick={handleRelease} disabled={instance.status === 'releasing' || instance.status === 'released'}>
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>
        </div>
      </div>

      {/* 节点离线提示：实例被系统自动挂起，非用户操作，避免用户困惑 */}
      {instance.status === 'node_offline' && (
        <div className="flex items-start gap-2.5 text-sm py-3 px-4 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span>该实例所在的宿主机节点已离线，系统已自动挂起实例。这并非您的操作所致，节点恢复后实例将自动拉起，无需手动处理。</span>
            <span className="block mt-0.5">挂起期间不会产生费用：按量计费实例停止计费，包年包月实例有效期不受影响，可前往
              <Link href="/billing/details" className="underline underline-offset-2 mx-0.5 font-medium hover:opacity-80">计费详情</Link>
              查看。</span>
          </div>
        </div>
      )}

      {/* 已关机提示：停机期间算力配额已释放，存在被其他用户占用导致开机失败的可能，
           需持续提醒（关机弹窗只在操作那一刻可见，用户事后回到页面仍需知情） */}
      {instance.status === 'stopped' && (
        <div className="flex items-start gap-2.5 text-sm py-3 px-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">实例已关机，原有资源可能已被分配给其他用户，再次开机存在启动失败的可能性。</span>
            <span className="block mt-0.5">
              {instance.gpu_model && (instance.gpu_count ?? 0) > 0
                ? `停机期间 ${instance.gpu_model} × ${instance.gpu_count} 及 CPU / 内存已释放到公共资源池；`
                : '停机期间实例占用的 CPU / 内存已释放到公共资源池；'}
              数据盘保存在原节点本地，实例只能在同一节点开机，若该节点资源已被占满，开机会失败并提示具体原因，需等待资源释放后重试。
            </span>
          </div>
        </div>
      )}

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
                {/* 运行态规格可能低于购买规格（无卡模式 / 降配开机），必须把实际生效的值标出来，
                    否则用户看到的配置与实际可用资源、实际扣费均不一致 */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4" /> GPU
                  </span>
                  {instance.runtime_gpu_count === 0 && (instance.gpu_count ?? 0) > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-muted-foreground">{instance.gpu_model} × {instance.gpu_count}</span>
                      <Badge variant="outline" className="px-1 py-0 text-[10px] border-amber-300 text-amber-600 dark:text-amber-400">无卡模式</Badge>
                    </span>
                  ) : (
                    <span>{instance.gpu_model} × {instance.gpu_count}</span>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4" /> CPU
                  </span>
                  <span className="flex items-center gap-1.5">
                    {instance.runtime_cpu_cores ?? instance.cpu_cores} 核
                    {instance.runtime_cpu_cores != null && (
                      <Badge variant="outline" className="px-1 py-0 text-[10px] border-amber-300 text-amber-600 dark:text-amber-400"
                        title={`购买规格 ${instance.cpu_cores} 核`}>已调配</Badge>
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" /> 内存
                  </span>
                  <span className="flex items-center gap-1.5">
                    {instance.runtime_memory ?? instance.memory} GB
                    {instance.runtime_memory != null && (
                      <Badge variant="outline" className="px-1 py-0 text-[10px] border-amber-300 text-amber-600 dark:text-amber-400"
                        title={`购买规格 ${instance.memory} GB`}>已调配</Badge>
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <HardDrive className="h-4 w-4" /> 磁盘
                  </span>
                  <span>{instance.disk || '-'} GB</span>
                </div>
                {/* 数据盘在节点上的实际目录（末尾 uuid 即实例数据目录），未启用持久数据盘时不展示 */}
                {instance.data_disk_path && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground pl-6">数据盘目录</span>
                    <span className="text-xs font-mono text-muted-foreground max-w-[260px] truncate" title={instance.data_disk_path}>
                      {instance.data_disk_path}
                    </span>
                  </div>
                )}
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
                  <span className="text-sm">{instance.created_at ? formatTime(instance.created_at) : '-'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">启动时间</span>
                  <span className="text-sm">{instance.started_at ? formatTime(instance.started_at) : '-'}</span>
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
                  最后更新: {metrics?.timestamp ? formatTime(metrics.timestamp) : '-'}
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

      {/* 开机选项弹窗：无卡模式 / 调整 CPU 内存后开机，与实例列表页共用同一组件 */}
      <StartOptionsDialog
        instance={showStartDialog ? instance : null}
        onClose={() => setShowStartDialog(false)}
        onConfirm={async (opts) => {
          await startInstance(opts)
          setTimeout(refresh, 2000)
        }}
      />

      {/* 调整规格弹窗：关机态预先改规格（无卡↔带卡 / CPU / 内存），不开机，下次开机生效 */}
      <StartOptionsDialog
        mode="adjust"
        instance={showSpecDialog ? instance : null}
        onClose={() => setShowSpecDialog(false)}
        onConfirm={async (opts) => {
          await api.patch(`/instances/${instanceId}/spec`, opts)
          refresh()
        }}
      />

      {/* 关机确认弹窗：与实例列表页保持同一套风险告知口径 */}
      <AlertDialog open={showStopDialog} onOpenChange={(open) => { if (!open) setShowStopDialog(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <PowerOff className="h-5 w-5" /> 关机实例
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要关闭实例 <strong>{instance.name}</strong> 吗？关机后按量计费停止扣费，数据盘内容保留。
            </AlertDialogDescription>
            <div className="flex items-start gap-2.5 text-sm py-2.5 px-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">关机后原有资源可能被分配给其他用户，再次开机存在启动失败的可能性。</span>
                <span className="block mt-0.5">
                  {instance.gpu_model && (instance.gpu_count ?? 0) > 0
                    ? `本实例的 ${instance.gpu_model} × ${instance.gpu_count} 及 CPU / 内存会立即释放到公共资源池；`
                    : '本实例占用的 CPU / 内存会立即释放到公共资源池；'}
                  数据盘保存在当前节点本地，实例只能在同一节点重新开机，若届时该节点资源已被其他实例占满，开机将失败，需等待资源释放后重试。
                </span>
                <span className="block mt-0.5">若短时间内还要继续使用，建议保持开机；长时间不用请先备份容器内的重要数据。</span>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopping}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop} disabled={stopping} className="bg-amber-600 hover:bg-amber-700 text-white">
              {stopping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认关机
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
