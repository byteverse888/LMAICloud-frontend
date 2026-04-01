'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Power, PowerOff, Trash2, Loader2, RefreshCw,
  Bot, Key, Radio, Puzzle, Activity,
  Cpu, HardDrive, Globe, Server, Clock, Wifi,
  Plus, Pencil, CheckCircle, XCircle, AlertTriangle,
  RotateCw, ScrollText, Terminal,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

const WebTerminal = dynamic(
  () => import('@/components/terminal/web-terminal'),
  { ssr: false }
)

import {
  useOpenClawInstance, useOpenClawModelKeys, useOpenClawChannels,
  useOpenClawSkills, useOpenClawMonitor, useOpenClawLogs,
} from '@/hooks/use-openclaw'

const getStatusBadge = (status: string) => {
  const cfg: Record<string, { label: string; variant: any; dot: string }> = {
    running: { label: '运行中', variant: 'success', dot: 'bg-emerald-500' },
    stopped: { label: '已停止', variant: 'secondary', dot: 'bg-gray-400' },
    creating: { label: '创建中', variant: 'outline', dot: 'bg-blue-500' },
    error: { label: '异常', variant: 'destructive', dot: 'bg-red-500' },
    releasing: { label: '删除中', variant: 'warning', dot: 'bg-amber-500' },
    released: { label: '已删除', variant: 'secondary', dot: 'bg-gray-400' },
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

export default function OpenClawDetailPage() {
  const params = useParams()
  const router = useRouter()
  const instanceId = params.id as string
  const { token } = useAuthStore()

  const { instance, loading, refresh, startInstance, stopInstance, deleteInstance } = useOpenClawInstance(instanceId)
  const { keys, loading: keysLoading, refresh: refreshKeys, addKey, updateKey, deleteKey } = useOpenClawModelKeys(instanceId)
  const { channels, loading: channelsLoading, refresh: refreshChannels, addChannel, updateChannel, deleteChannel } = useOpenClawChannels(instanceId)
  const { skills, loading: skillsLoading, refresh: refreshSkills, installSkill, uninstallSkill } = useOpenClawSkills(instanceId)
  const { monitorStatus, loading: monitorLoading, refresh: refreshMonitor } = useOpenClawMonitor(instanceId)
  const { logs, loading: logsLoading, refresh: refreshLogs } = useOpenClawLogs(instanceId)

  // 密钥弹窗
  const [showAddKey, setShowAddKey] = useState(false)
  const [keyForm, setKeyForm] = useState({ provider: 'openai', alias: '', api_key: '', base_url: '', model_name: '' })
  const [keySubmitting, setKeySubmitting] = useState(false)
  const [deleteKeyTarget, setDeleteKeyTarget] = useState<string | null>(null)

  // 通道弹窗
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [channelForm, setChannelForm] = useState({ type: 'telegram', name: '', config: '' })
  const [channelSubmitting, setChannelSubmitting] = useState(false)
  const [deleteChannelTarget, setDeleteChannelTarget] = useState<string | null>(null)

  // Skill 弹窗
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [skillForm, setSkillForm] = useState({ name: '', description: '', version: '' })
  const [skillSubmitting, setSkillSubmitting] = useState(false)

  // WebShell 终端
  const [terminalOpen, setTerminalOpen] = useState(false)

  // 操作
  const handleStart = async () => { try { await startInstance(); toast.success('启动中'); setTimeout(refresh, 2000) } catch { toast.error('启动失败') } }
  const handleStop = async () => { try { await stopInstance(); toast.success('已停止') } catch { toast.error('停止失败') } }
  const handleDelete = async () => { try { await deleteInstance(); toast.success('删除中'); router.push('/openclaw') } catch { toast.error('删除失败') } }
  const handleRestart = async () => {
    try { await api.post(`/openclaw/instances/${instanceId}/restart`); toast.success('重启中'); setTimeout(refresh, 3000) } catch { toast.error('重启失败') }
  }
  const openTerminal = () => {
    if (instance?.status === 'running') {
      setTerminalOpen(true)
    } else {
      toast.error('实例未运行，无法打开终端')
    }
  }

  // 密钥操作
  const handleAddKey = async () => {
    if (!keyForm.api_key) { toast.error('请输入 API Key'); return }
    try { setKeySubmitting(true); await addKey(keyForm); toast.success('密钥已添加'); setShowAddKey(false); setKeyForm({ provider: 'openai', alias: '', api_key: '', base_url: '', model_name: '' }) }
    catch { toast.error('添加失败') } finally { setKeySubmitting(false) }
  }
  const handleDeleteKey = async () => {
    if (!deleteKeyTarget) return
    try { await deleteKey(deleteKeyTarget); toast.success('密钥已删除'); setDeleteKeyTarget(null) } catch { toast.error('删除失败') }
  }

  // 通道操作
  const handleAddChannel = async () => {
    if (!channelForm.type) { toast.error('请选择通道类型'); return }
    try { setChannelSubmitting(true); await addChannel(channelForm); toast.success('通道已添加'); setShowAddChannel(false); setChannelForm({ type: 'telegram', name: '', config: '' }) }
    catch { toast.error('添加失败') } finally { setChannelSubmitting(false) }
  }
  const handleDeleteChannel = async () => {
    if (!deleteChannelTarget) return
    try { await deleteChannel(deleteChannelTarget); toast.success('通道已删除'); setDeleteChannelTarget(null) } catch { toast.error('删除失败') }
  }

  // Skill 操作
  const handleInstallSkill = async () => {
    if (!skillForm.name) { toast.error('请输入技能名称'); return }
    try { setSkillSubmitting(true); await installSkill(skillForm); toast.success('技能安装中'); setShowAddSkill(false); setSkillForm({ name: '', description: '', version: '' }) }
    catch { toast.error('安装失败') } finally { setSkillSubmitting(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }
  if (!instance) {
    return <div className="text-center py-20 text-muted-foreground">实例不存在或已被删除</div>
  }

  return (
    <div className="space-y-6">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/openclaw')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> {instance.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">ID: {instance.id}</p>
          </div>
          <div className="ml-2">{getStatusBadge(instance.status)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openTerminal} disabled={instance.status !== 'running'}>
            <Terminal className="h-4 w-4 mr-1" /> 登录终端
          </Button>
          <Button variant="outline" size="sm" onClick={handleStart} disabled={!['stopped', 'error'].includes(instance.status)}>
            <Power className="h-4 w-4 mr-1" /> 启动
          </Button>
          <Button variant="outline" size="sm" onClick={handleStop} disabled={instance.status !== 'running'}>
            <PowerOff className="h-4 w-4 mr-1" /> 停止
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestart} disabled={instance.status !== 'running'}>
            <RotateCw className="h-4 w-4 mr-1" /> 重启
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={['releasing', 'released'].includes(instance.status)}>
            <Trash2 className="h-4 w-4 mr-1" /> 删除
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><Server className="h-3.5 w-3.5" /> 概览</TabsTrigger>
          <TabsTrigger value="keys" className="gap-1"><Key className="h-3.5 w-3.5" /> 大模型密钥</TabsTrigger>
          <TabsTrigger value="channels" className="gap-1"><Radio className="h-3.5 w-3.5" /> 通道配置</TabsTrigger>
          <TabsTrigger value="skills" className="gap-1"><Puzzle className="h-3.5 w-3.5" /> Skills</TabsTrigger>
          <TabsTrigger value="monitor" className="gap-1"><Activity className="h-3.5 w-3.5" /> 监控</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1"><ScrollText className="h-3.5 w-3.5" /> 日志</TabsTrigger>
        </TabsList>

        {/* ===== 概览 ===== */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">名称</span><span className="font-medium">{instance.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">状态</span>{getStatusBadge(instance.status)}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">命名空间</span><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{instance.namespace || '-'}</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground">节点类型</span><Badge variant="outline">{instance.node_type === 'edge' ? '边缘' : '云端'}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">节点名</span><span>{instance.node_name || '-'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">资源 & 连接</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> CPU</span><span>{instance.cpu_cores} 核</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">内存</span><span>{instance.memory_gb} GB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" /> 磁盘</span><span>{instance.disk_gb} GB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">端口</span><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{instance.port}</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /> 内网 IP</span><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{instance.internal_ip || '-'}</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 创建时间</span><span>{instance.created_at ? new Date(instance.created_at).toLocaleString() : '-'}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== 大模型密钥 ===== */}
        <TabsContent value="keys">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">大模型密钥</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshKeys()} disabled={keysLoading}><RefreshCw className={`h-3.5 w-3.5 mr-1 ${keysLoading ? 'animate-spin' : ''}`} /> 刷新</Button>
                <Button size="sm" onClick={() => setShowAddKey(true)}><Plus className="h-3.5 w-3.5 mr-1" /> 添加</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>别名</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>余额</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-20 text-center text-muted-foreground">暂无密钥</TableCell></TableRow>
                  ) : keys.map(k => (
                    <TableRow key={k.id}>
                      <TableCell><Badge variant="outline">{k.provider}</Badge></TableCell>
                      <TableCell>{k.alias || '-'}</TableCell>
                      <TableCell><code className="text-xs">{k.api_key_masked || '••••••'}</code></TableCell>
                      <TableCell>{k.model_name || '-'}</TableCell>
                      <TableCell>
                        {k.check_status === 'ok' ? <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> 正常</Badge>
                          : k.check_status === 'error' ? <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> 异常</Badge>
                          : <Badge variant="secondary">未检测</Badge>}
                      </TableCell>
                      <TableCell>{k.balance != null ? `¥${k.balance.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteKeyTarget(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 通道配置 ===== */}
        <TabsContent value="channels">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">通道配置</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshChannels()} disabled={channelsLoading}><RefreshCw className={`h-3.5 w-3.5 mr-1 ${channelsLoading ? 'animate-spin' : ''}`} /> 刷新</Button>
                <Button size="sm" onClick={() => setShowAddChannel(true)}><Plus className="h-3.5 w-3.5 mr-1" /> 添加</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>在线状态</TableHead>
                    <TableHead>最后检查</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">暂无通道</TableCell></TableRow>
                  ) : channels.map(ch => (
                    <TableRow key={ch.id}>
                      <TableCell><Badge variant="outline">{ch.type}</Badge></TableCell>
                      <TableCell>{ch.name || '-'}</TableCell>
                      <TableCell>
                        {ch.online_status === 'online' ? <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> 在线</Badge>
                          : ch.online_status === 'offline' ? <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> 离线</Badge>
                          : <Badge variant="secondary">未知</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ch.last_check_at ? new Date(ch.last_check_at).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteChannelTarget(ch.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Skills ===== */}
        <TabsContent value="skills">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Skills 管理</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refreshSkills()} disabled={skillsLoading}><RefreshCw className={`h-3.5 w-3.5 mr-1 ${skillsLoading ? 'animate-spin' : ''}`} /> 刷新</Button>
                <Button size="sm" onClick={() => setShowAddSkill(true)}><Plus className="h-3.5 w-3.5 mr-1" /> 安装技能</Button>
              </div>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <Puzzle className="h-10 w-10 mb-2 opacity-40" />
                  <p>暂无已安装技能</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skills.map(skill => (
                    <Card key={skill.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium flex items-center gap-1.5">
                            <Puzzle className="h-4 w-4 text-primary" /> {skill.name}
                          </h4>
                          {skill.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            {skill.version && <Badge variant="outline" className="text-xs">v{skill.version}</Badge>}
                            {skill.status === 'installed' ? <Badge variant="success" className="text-xs">已安装</Badge>
                              : skill.status === 'installing' ? <Badge variant="outline" className="text-xs gap-1"><Loader2 className="h-3 w-3 animate-spin" /> 安装中</Badge>
                              : skill.status === 'error' ? <Badge variant="destructive" className="text-xs">错误</Badge>
                              : <Badge variant="secondary" className="text-xs">{skill.status}</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { uninstallSkill(skill.name).then(() => toast.success('卸载中')).catch(() => toast.error('卸载失败')) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 监控 ===== */}
        <TabsContent value="monitor">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">实时状态</CardTitle>
              <Button variant="outline" size="sm" onClick={() => refreshMonitor()} disabled={monitorLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${monitorLoading ? 'animate-spin' : ''}`} /> 刷新
              </Button>
            </CardHeader>
            <CardContent>
              {monitorLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : monitorStatus ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">健康状态</p>
                    {monitorStatus.health ? <CheckCircle className="h-8 w-8 mx-auto text-emerald-500" /> : <XCircle className="h-8 w-8 mx-auto text-red-500" />}
                    <p className="text-sm mt-1 font-medium">{monitorStatus.health ? '健康' : '异常'}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">就绪状态</p>
                    {monitorStatus.ready ? <CheckCircle className="h-8 w-8 mx-auto text-emerald-500" /> : <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />}
                    <p className="text-sm mt-1 font-medium">{monitorStatus.ready ? '就绪' : '未就绪'}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">会话数</p>
                    <p className="text-2xl font-bold text-primary">{monitorStatus.session_count ?? '-'}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Skills 数</p>
                    <p className="text-2xl font-bold text-primary">{monitorStatus.skills_installed ?? '-'}</p>
                  </div>
                  {monitorStatus.gateway_version && (
                    <div className="rounded-lg border p-4 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Gateway 版本</p>
                      <p className="font-mono text-sm">{monitorStatus.gateway_version}</p>
                    </div>
                  )}
                  {monitorStatus.uptime != null && (
                    <div className="rounded-lg border p-4 col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">运行时长</p>
                      <p className="font-mono text-sm">{Math.floor(monitorStatus.uptime / 3600)}h {Math.floor((monitorStatus.uptime % 3600) / 60)}m</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>实例未运行或无法获取监控数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 日志 ===== */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">实例日志</CardTitle>
              <Button variant="outline" size="sm" onClick={() => refreshLogs()} disabled={logsLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${logsLoading ? 'animate-spin' : ''}`} /> 刷新
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-950 rounded-lg p-4 max-h-[500px] overflow-auto">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                  {logsLoading ? '加载中...' : (logs || '暂无日志')}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== 弹窗：添加密钥 ===== */}
      <Dialog open={showAddKey} onOpenChange={setShowAddKey}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>添加大模型密钥</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={keyForm.provider} onValueChange={v => setKeyForm(f => ({ ...f, provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="qwen">通义千问</SelectItem>
                  <SelectItem value="zhipu">智谱</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>别名</Label><Input placeholder="可选" value={keyForm.alias} onChange={e => setKeyForm(f => ({ ...f, alias: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>API Key *</Label><Input placeholder="sk-..." value={keyForm.api_key} onChange={e => setKeyForm(f => ({ ...f, api_key: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Base URL</Label><Input placeholder="可选，自定义 endpoint" value={keyForm.base_url} onChange={e => setKeyForm(f => ({ ...f, base_url: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>默认模型</Label><Input placeholder="如 gpt-4o" value={keyForm.model_name} onChange={e => setKeyForm(f => ({ ...f, model_name: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddKey(false)}>取消</Button>
            <Button onClick={handleAddKey} disabled={keySubmitting}>{keySubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 弹窗：添加通道 ===== */}
      <Dialog open={showAddChannel} onOpenChange={setShowAddChannel}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>添加通道</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>通道类型</Label>
              <Select value={channelForm.type} onValueChange={v => setChannelForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="wechat">微信</SelectItem>
                  <SelectItem value="feishu">飞书</SelectItem>
                  <SelectItem value="dingtalk">钉钉</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>名称</Label><Input placeholder="可选" value={channelForm.name} onChange={e => setChannelForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>配置 (JSON)</Label><Input placeholder='{"token":"xxx"}' value={channelForm.config} onChange={e => setChannelForm(f => ({ ...f, config: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddChannel(false)}>取消</Button>
            <Button onClick={handleAddChannel} disabled={channelSubmitting}>{channelSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 弹窗：安装技能 ===== */}
      <Dialog open={showAddSkill} onOpenChange={setShowAddSkill}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>安装技能</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>技能名称 *</Label><Input placeholder="skill-name" value={skillForm.name} onChange={e => setSkillForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>描述</Label><Input placeholder="可选" value={skillForm.description} onChange={e => setSkillForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>版本</Label><Input placeholder="1.0.0" value={skillForm.version} onChange={e => setSkillForm(f => ({ ...f, version: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSkill(false)}>取消</Button>
            <Button onClick={handleInstallSkill} disabled={skillSubmitting}>{skillSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 安装</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 删除密钥确认 ===== */}
      <AlertDialog open={!!deleteKeyTarget} onOpenChange={open => { if (!open) setDeleteKeyTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除密钥</AlertDialogTitle>
            <AlertDialogDescription>确定要删除该密钥吗？删除后 OpenClaw 将无法使用此 Provider。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-red-600 hover:bg-red-700 text-white">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== 删除通道确认 ===== */}
      <AlertDialog open={!!deleteChannelTarget} onOpenChange={open => { if (!open) setDeleteChannelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除通道</AlertDialogTitle>
            <AlertDialogDescription>确定要删除该通道吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChannel} className="bg-red-600 hover:bg-red-700 text-white">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== WebShell 终端弹窗 ===== */}
      <Dialog open={terminalOpen} onOpenChange={setTerminalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">OpenClaw 终端</DialogTitle>
          {terminalOpen && token && (
            <WebTerminal
              instanceId={instanceId}
              token={token}
              instanceName={instance?.name}
              wsPath="/ws/openclaw/terminal"
              onClose={() => setTerminalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
