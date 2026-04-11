'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft, Power, PowerOff, RotateCcw, Trash2, Terminal,
  Cpu, MemoryStick, HardDrive, Clock, Activity, Globe,
  Loader2, RefreshCw, User, Key, Radio, Puzzle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import {
  useOpenClawInstance, useOpenClawModelKeys, useOpenClawChannels,
  useOpenClawSkills, useOpenClawLogs,
} from '@/hooks/use-openclaw'

const WebTerminal = dynamic(
  () => import('@/components/terminal/web-terminal'),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> }
)

const getStatusBadge = (status: string) => {
  const cfg: Record<string, { label: string; variant: any; dot: string }> = {
    running: { label: '运行中', variant: 'success', dot: 'bg-emerald-500' },
    stopped: { label: '已停止', variant: 'secondary', dot: 'bg-gray-400' },
    creating: { label: '创建中', variant: 'outline', dot: 'bg-blue-500' },
    error: { label: '异常', variant: 'destructive', dot: 'bg-red-500' },
    releasing: { label: '删除中', variant: 'warning', dot: 'bg-amber-500' },
    released: { label: '已删除', variant: 'secondary', dot: 'bg-gray-400' },
    expired: { label: '已过期', variant: 'warning', dot: 'bg-orange-500' },
  }
  const c = cfg[status] || { label: status, variant: 'secondary', dot: 'bg-gray-400' }
  const isTransient = ['creating', 'releasing'].includes(status)
  const isActive = status === 'running'
  return (
    <Badge variant={c.variant} className="gap-1.5">
      <span className="relative flex h-2 w-2">
        {(isActive || isTransient) && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${c.dot} ${isTransient ? 'animate-ping' : 'animate-pulse'}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`} />
      </span>
      {c.label}
    </Badge>
  )
}

export default function AdminOpenClawDetailPage() {
  const params = useParams()
  const router = useRouter()
  const instanceId = params.id as string
  const { token } = useAuthStore()

  const { instance: _instance, loading, refresh, silentRefresh, startInstance, stopInstance, deleteInstance } = useOpenClawInstance(instanceId)
  const instance = _instance as any
  const { keys, loading: keysLoading, refresh: refreshKeys } = useOpenClawModelKeys(instanceId)
  const { channels, loading: channelsLoading } = useOpenClawChannels(instanceId)
  const { skills, loading: skillsLoading } = useOpenClawSkills(instanceId)
  const { logs, loading: logsLoading, refresh: refreshLogs } = useOpenClawLogs(instanceId)

  const isTransient = _instance && ['creating', 'starting', 'stopping', 'releasing'].includes(_instance.status)
  useEffect(() => {
    if (!isTransient) return
    const iv = setInterval(silentRefresh, 5000)
    return () => clearInterval(iv)
  }, [isTransient, silentRefresh])

  const [terminalOpen, setTerminalOpen] = useState(false)

  const handleStart = async () => { try { await startInstance(); toast.success('启动中'); setTimeout(refresh, 2000) } catch { toast.error('启动失败') } }
  const handleStop = async () => { try { await stopInstance(); toast.success('已停止') } catch { toast.error('停止失败') } }
  const handleRestart = async () => { try { await api.post(`/openclaw/instances/${instanceId}/restart`); toast.success('重启中'); setTimeout(refresh, 3000) } catch { toast.error('重启失败') } }
  const handleDelete = async () => {
    if (!confirm('确定要删除该 OpenClaw 实例吗？删除后数据将无法恢复。')) return
    try { await deleteInstance(); toast.success('删除中'); setTimeout(() => router.push('/admin/openclaw'), 1000) } catch { toast.error('删除失败') }
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>

  if (!_instance) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">实例不存在</p>
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
            <Button variant="ghost" size="icon" onClick={() => refresh()}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            实例ID: {instance.id} · 命名空间: {instance.namespace || '-'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {instance.status === 'running' ? (
            <>
              <Button variant="outline" onClick={() => setTerminalOpen(true)}><Terminal className="h-4 w-4 mr-2" />终端</Button>
              <Button variant="outline" onClick={handleStop}><PowerOff className="h-4 w-4 mr-2" />停止</Button>
              <Button variant="outline" onClick={handleRestart}><RotateCcw className="h-4 w-4 mr-2" />重启</Button>
            </>
          ) : instance.status === 'stopped' ? (
            <Button onClick={handleStart}><Power className="h-4 w-4 mr-2" />启动</Button>
          ) : null}
          <Button variant="destructive" onClick={handleDelete} disabled={instance.status === 'releasing' || instance.status === 'released'}>
            <Trash2 className="h-4 w-4 mr-2" />删除
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-full">
          <TabsTrigger value="overview" className="rounded-full px-4">概览</TabsTrigger>
          <TabsTrigger value="config" className="rounded-full px-4">配置</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-full px-4">日志</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="card-clean">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" /> 归属信息</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">用户 ID</span>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{instance.user_id || '-'}</code>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">命名空间</span>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{instance.namespace || '-'}</code>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">节点类型</span>
                  <Badge variant="outline">{instance.node_type || 'center'}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">计费方式</span>
                  <Badge variant="outline">{instance.billing_type === 'hourly' ? '按量计费' : instance.billing_type === 'monthly' ? '包月' : '包年'}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> 创建时间</span>
                  <span className="text-sm">{instance.created_at ? new Date(instance.created_at).toLocaleString() : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-clean">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> 资源配置</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2"><Cpu className="h-4 w-4" /> CPU</span>
                  <span>{instance.cpu_cores || '-'} 核</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2"><MemoryStick className="h-4 w-4" /> 内存</span>
                  <span>{instance.memory_gb || '-'} GB</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2"><HardDrive className="h-4 w-4" /> 磁盘</span>
                  <span>{instance.disk_gb || '-'} GB</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2"><Globe className="h-4 w-4" /> 服务端口</span>
                  <span>{instance.port || 18789}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">单价</span>
                  <span className="text-red-500 font-medium">¥{instance.hourly_price || '0'}/时</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pod 状态 */}
          {instance.deployment_info && (
            <Card className="card-clean">
              <CardHeader><CardTitle className="text-base">Deployment 状态</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deployment</span>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{instance.deployment_info.name || '-'}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">副本</span>
                  <span>{instance.deployment_info.ready_replicas}/{instance.deployment_info.replicas}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 配置（只读展示） */}
        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* 密钥 */}
            <Card className="card-clean">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> 大模型密钥 ({keys?.length || 0})</CardTitle></CardHeader>
              <CardContent>
                {keysLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : keys && keys.length > 0 ? (
                  <div className="space-y-2">
                    {keys.map((k: any) => (
                      <div key={k.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">{k.alias || k.provider}</span>
                          <span className="text-xs text-muted-foreground ml-2">{k.model_name || ''}</span>
                        </div>
                        <Badge variant={k.status === 'active' ? 'success' : 'secondary'} className="text-xs">{k.status || 'active'}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-4">暂无密钥</p>}
              </CardContent>
            </Card>

            {/* 通道 */}
            <Card className="card-clean">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4 text-primary" /> 通道 ({channels?.length || 0})</CardTitle></CardHeader>
              <CardContent>
                {channelsLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : channels && channels.length > 0 ? (
                  <div className="space-y-2">
                    {channels.map((ch: any) => (
                      <div key={ch.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                        <span className="font-medium">{ch.name || ch.type}</span>
                        <Badge variant={ch.status === 'active' ? 'success' : 'secondary'} className="text-xs">{ch.status || 'active'}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-4">暂无通道</p>}
              </CardContent>
            </Card>

            {/* 技能 */}
            <Card className="card-clean">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Puzzle className="h-4 w-4 text-primary" /> 技能 ({skills?.length || 0})</CardTitle></CardHeader>
              <CardContent>
                {skillsLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : skills && skills.length > 0 ? (
                  <div className="space-y-2">
                    {skills.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">v{s.version || '1.0'}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-4">暂无技能</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 日志 */}
        <TabsContent value="logs">
          <Card className="card-clean">
            <CardHeader><CardTitle className="text-base">实例日志</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-auto">
                <pre>{logs || '暂无日志'}</pre>
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
            <WebTerminal instanceId={instanceId} token={token} instanceName={instance?.name} wsPath="/ws/openclaw/admin/terminal" onClose={() => setTerminalOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
