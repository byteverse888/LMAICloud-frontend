'use client'

import { useState, useEffect, useRef } from 'react'
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
  Copy,
  ExternalLink,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  Activity,
  FileText,
  Settings,
  MonitorUp,
  Loader2,
  RefreshCw,
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
  
  // WebSocket实时状态订阅
  const { connected: wsConnected } = useInstanceWebSocket(instanceId, (status) => {
    if (status && instance) {
      refresh()
      if (status === 'running') toast.success('实例已启动')
      else if (status === 'stopped') toast.success('实例已停止')
      else if (status === 'error') toast.error('实例发生异常')
    }
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [showRenewDialog, setShowRenewDialog] = useState(false)
  const [renewHours, setRenewHours] = useState(1)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label}已复制`)
  }

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
      toast.success('实例停止中')
      setTimeout(refresh, 2000)
    } catch (e) {
      toast.error('停止失败')
    }
  }

  const handleRelease = async () => {
    if (!confirm('确定要释放该实例吗？释放后数据将无法恢复。')) return
    try {
      await releaseInstance()
      toast.success('实例释放中')
      setTimeout(() => router.push('/instances'), 1000)
    } catch (e) {
      toast.error('释放失败')
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; dotClass: string; pulse?: boolean }> = {
      running: { label: '运行中', variant: 'success', dotClass: 'bg-emerald-500', pulse: true },
      stopped: { label: '已停止', variant: 'secondary', dotClass: 'bg-gray-400' },
      creating: { label: '创建中', variant: 'default', dotClass: 'bg-blue-500', pulse: true },
      starting: { label: '启动中', variant: 'default', dotClass: 'bg-blue-500', pulse: true },
      stopping: { label: '停止中', variant: 'warning', dotClass: 'bg-amber-500', pulse: true },
      releasing: { label: '释放中', variant: 'warning', dotClass: 'bg-amber-500', pulse: true },
      released: { label: '已释放', variant: 'secondary', dotClass: 'bg-gray-400' },
      error: { label: '异常', variant: 'destructive', dotClass: 'bg-red-500' },
    }
    const { label, variant, dotClass, pulse } = config[status] || { label: status, variant: 'secondary' as const, dotClass: 'bg-gray-400' }
    return (
      <Badge variant={variant} className="gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass} ${pulse ? 'animate-pulse' : ''}`} />
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
            实例ID: {instance.id} · 节点: {instance.node_id || '-'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {instance.status === 'running' ? (
            <>
              <Button variant="outline" onClick={handleStop}>
                <PowerOff className="h-4 w-4 mr-2" />
                关机
              </Button>
              <Button variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
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
            释放
          </Button>
        </div>
      </div>

      {/* 快速连接 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              SSH 连接
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">地址</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded">{instance.ssh_host || '-'}:{instance.ssh_port || '-'}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(`${instance.ssh_host}:${instance.ssh_port}`, 'SSH地址')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">密码</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded">
                  {showPassword ? (instance.ssh_password || '-') : '••••••••'}
                </code>
                <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '隐藏' : '显示'}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(instance.ssh_password || '', '密码')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="pt-2">
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => setTerminalOpen(true)}
                disabled={!['running', 'error'].includes(instance.status)}
              >
                <Terminal className="h-4 w-4 mr-2" />
                打开 Web Terminal
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MonitorUp className="h-4 w-4" />
              JupyterLab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              通过浏览器访问 JupyterLab 进行交互式开发
            </p>
            <Button className="w-full" disabled>
              <ExternalLink className="h-4 w-4 mr-2" />
              JupyterLab (待集成)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="monitor">监控</TabsTrigger>
          <TabsTrigger value="logs">日志</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 配置信息 */}
            <Card>
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

            {/* 费用信息 */}
            <Card>
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
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">镜像</span>
                  <span className="text-sm">{instance.image_id || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 监控 */}
        <TabsContent value="monitor" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">GPU 使用率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>计算</span>
                    <span className={metrics?.gpu_util && metrics.gpu_util > 80 ? 'text-red-500' : ''}>{metrics?.gpu_util ?? '-'}%</span>
                  </div>
                  <Progress value={metrics?.gpu_util ?? 0} className="h-2" />
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span>显存</span>
                    <span className={metrics?.gpu_memory && metrics.gpu_memory > 80 ? 'text-red-500' : ''}>{metrics?.gpu_memory ?? '-'}%</span>
                  </div>
                  <Progress value={metrics?.gpu_memory ?? 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">系统资源</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU</span>
                    <span className={metrics?.cpu_util && metrics.cpu_util > 80 ? 'text-red-500' : ''}>{metrics?.cpu_util ?? '-'}%</span>
                  </div>
                  <Progress value={metrics?.cpu_util ?? 0} className="h-2" />
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span>内存</span>
                    <span className={metrics?.memory_util && metrics.memory_util > 80 ? 'text-red-500' : ''}>{metrics?.memory_util ?? '-'}%</span>
                  </div>
                  <Progress value={metrics?.memory_util ?? 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">磁盘使用</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{metrics?.disk_util ?? '-'}%</div>
                    <div className="text-sm text-muted-foreground">已用</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">网络入流量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{metrics?.network_in ?? '-'}</div>
                    <div className="text-sm text-muted-foreground">MB/s</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">网络出流量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{metrics?.network_out ?? '-'}</div>
                    <div className="text-sm text-muted-foreground">MB/s</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  最后更新: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : '-'}
                </span>
                <Badge variant={instance?.status === 'running' ? 'success' : 'secondary'}>
                  {instance?.status === 'running' ? '实时监控中' : '实例未运行'}
                </Badge>
              </div>
              <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                历史趋势图表（集成Prometheus后展示）
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 日志 */}
        <TabsContent value="logs">
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">实例设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">实例名称</div>
                  <p className="text-sm text-muted-foreground">{instance.name}</p>
                </div>
                <Button variant="outline" size="sm">修改</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">数据盘扩容</div>
                  <p className="text-sm text-muted-foreground">当前 {instance.disk || '-'} GB</p>
                </div>
                <Button variant="outline" size="sm">扩容</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">重置SSH密码</div>
                  <p className="text-sm text-muted-foreground">重置后需要重新登录</p>
                </div>
                <Button variant="outline" size="sm">重置</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">保存为镜像</div>
                  <p className="text-sm text-muted-foreground">将当前实例环境保存为自定义镜像</p>
                </div>
                <Button variant="outline" size="sm">保存</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 终端弹窗 */}
      <Dialog open={terminalOpen} onOpenChange={setTerminalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b">
            <DialogTitle>Web Terminal - {instance.name}</DialogTitle>
          </DialogHeader>
          {terminalOpen && token && (
            <WebTerminal
              instanceId={instanceId}
              token={token}
              onClose={() => setTerminalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
