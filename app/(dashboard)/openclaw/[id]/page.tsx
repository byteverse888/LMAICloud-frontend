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
  ArrowLeft, Power, PowerOff, Trash2, Loader2, RefreshCw, Search, ExternalLink,
  Bot, Key, Radio, Puzzle, Activity,
  Cpu, HardDrive, Globe, Server, Clock, Wifi, CreditCard,
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
  const [channelForm, setChannelForm] = useState({ type: 'qq', name: '', config: '' })
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
          <TabsTrigger value="apps" className="gap-1"><Bot className="h-3.5 w-3.5" /> 应用管理</TabsTrigger>
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
            {/* 计费信息卡片 */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> 计费信息</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">计费类型</p>
                    <Badge variant={instance.billing_type === 'yearly' ? 'default' : instance.billing_type === 'monthly' ? 'secondary' : 'outline'}>
                      {instance.billing_type === 'yearly' ? '包年' : instance.billing_type === 'monthly' ? '包月' : '按量计费'}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">单价</p>
                    <p className="text-lg font-bold text-primary">¥{(instance.hourly_price || 0.12).toFixed(2)}<span className="text-xs text-muted-foreground font-normal">/时</span></p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">月估算</p>
                    <p className="text-lg font-bold">¥{((instance.hourly_price || 0.12) * 24 * 30).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">到期时间</p>
                    <p className="text-sm font-medium">{instance.expired_at ? new Date(instance.expired_at).toLocaleString() : '无（按量）'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== 应用管理（三列布局，参考腾讯云 OpenClaw） ===== */}
        <TabsContent value="apps">
          <Card>
            <CardContent className="p-6">
              {/* 提示信息 */}
              <div className="mb-5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-700 dark:text-blue-300 space-y-0.5">
                <p>1. 注意：请保护好API Key，避免泄漏造成额外损失。</p>
                <p>2. OpenClaw在调用模型时会携带较多上下文信息，因此Token消耗可能较高。建议使用时关注Token用量与计费情况。</p>
              </div>
              {/* OpenClaw 版本 & 状态 */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">OpenClaw <Badge variant="secondary" className="text-xs font-normal">已是最新版本</Badge></h3>
                    <div className="flex items-center gap-2 text-sm">
                      {getStatusBadge(instance.status)}
                      <Button variant="link" size="sm" className="text-blue-500 h-auto p-0" onClick={handleRestart} disabled={instance.status !== 'running'}>重启</Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { refreshKeys(); refreshChannels(); refreshSkills() }} disabled={keysLoading || channelsLoading || skillsLoading}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${keysLoading || channelsLoading || skillsLoading ? 'animate-spin' : ''}`} /> 刷新
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── 模型 (Models) ── */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Key className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold">模型 (Models)</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <Select value={keyForm.provider} onValueChange={v => setKeyForm(f => ({ ...f, provider: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="qwen">通义千问</SelectItem>
                        <SelectItem value="zhipu">智谱 AI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="other">自定义</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="默认模型名称" value={keyForm.model_name} onChange={e => setKeyForm(f => ({ ...f, model_name: e.target.value }))} />
                    <Input placeholder="API Key" type="password" value={keyForm.api_key} onChange={e => setKeyForm(f => ({ ...f, api_key: e.target.value }))} />
                    <Button className="w-full" variant="outline" onClick={handleAddKey} disabled={keySubmitting}>
                      {keySubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      一键添加并应用
                    </Button>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {keyForm.provider === 'openai' ? 'OpenAI GPT系列模型，全球领先的AI大模型服务。模型API及后付费设置，'
                        : keyForm.provider === 'deepseek' ? 'DeepSeek模型服务，提供高性价比的AI推理能力。模型API及后付费设置，'
                        : keyForm.provider === 'qwen' ? '通义千问，阿里云大模型服务。模型API及后付费设置，'
                        : keyForm.provider === 'zhipu' ? '智谱AI GLM系列模型。模型API及后付费设置，'
                        : '自定义模型服务，支持OpenAI兼容API。'}
                      <a href="#" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">点此查看 <ExternalLink className="h-3 w-3" /></a>
                    </p>
                  </div>
                  {/* 切换模型 */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">切换模型</p>
                    {keysLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : keys.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {keys.map(k => (
                          <div key={k.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5">
                            <div className="truncate">
                              <span className="font-medium">{k.provider}</span>
                              {k.model_name && <span className="text-muted-foreground ml-1">· {k.model_name}</span>}
                              {k.check_status === 'ok' && <CheckCircle className="h-3 w-3 text-emerald-500 inline ml-1" />}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setDeleteKeyTarget(k.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 通道 (Channels) ── */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Radio className="h-4 w-4 text-green-500" />
                    <h3 className="font-semibold">通道 (Channels)</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <Select value={channelForm.type} onValueChange={v => setChannelForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qq">QQ</SelectItem>
                        <SelectItem value="wechat">微信</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="discord">Discord</SelectItem>
                        <SelectItem value="feishu">飞书</SelectItem>
                        <SelectItem value="dingtalk">钉钉</SelectItem>
                        <SelectItem value="slack">Slack</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder={channelForm.type === 'qq' ? 'QQ机器人的App ID' : channelForm.type === 'wechat' ? '微信公众号AppID' : channelForm.type === 'telegram' ? 'Bot Token' : 'App ID'} value={channelForm.name} onChange={e => setChannelForm(f => ({ ...f, name: e.target.value }))} />
                    <Input placeholder={channelForm.type === 'qq' ? 'QQ机器人的App Secret' : channelForm.type === 'wechat' ? '微信公众号AppSecret' : channelForm.type === 'telegram' ? 'Chat ID（可选）' : 'App Secret'} type="password" value={channelForm.config} onChange={e => setChannelForm(f => ({ ...f, config: e.target.value }))} />
                    <Button className="w-full" variant="outline" onClick={handleAddChannel} disabled={channelSubmitting}>
                      {channelSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      添加并应用
                    </Button>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {channelForm.type === 'qq' ? '一键解锁智能玩法，开启你的个性化QQ机器人之旅。'
                        : channelForm.type === 'wechat' ? '接入微信公众号，打造您的智能微信助手。'
                        : '一键接入通道，开启您的个性化机器人之旅。'}
                      <a href="#" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">查看详情 <ExternalLink className="h-3 w-3" /></a>
                    </p>
                  </div>
                  {/* 已接入通道 */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">已接入通道</p>
                    {channelsLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : channels.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {channels.map(ch => (
                          <div key={ch.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5">
                            <div className="truncate">
                              <Badge variant="outline" className="text-xs mr-1">{ch.type}</Badge>
                              <span>{ch.name || '-'}</span>
                              {ch.online_status === 'online' && <CheckCircle className="h-3 w-3 text-emerald-500 inline ml-1" />}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setDeleteChannelTarget(ch.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 技能 (Skills) ── */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Puzzle className="h-4 w-4 text-purple-500" />
                    <h3 className="font-semibold">技能 (Skills)</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-8" placeholder="请输入ClawHub中上架的Skill名称，或输入后回车搜索" value={skillForm.name} onChange={e => setSkillForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleInstallSkill() }} />
                    </div>
                    <Button className="w-full" variant="outline" onClick={handleInstallSkill} disabled={skillSubmitting}>
                      {skillSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      安装技能
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      <a href="#" className="text-blue-500 hover:underline border-b border-dashed border-blue-300">获取更多Skills?</a>
                    </p>
                  </div>
                  {/* 已安装技能 */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">已安装技能</p>
                    <div className="border-b border-dashed mb-2" />
                    {skillsLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : skills.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {skills.map(skill => (
                          <div key={skill.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5">
                            <span className="font-medium truncate">{skill.name} {skill.version && skill.version}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => { uninstallSkill(skill.name).then(() => toast.success('卸载中')).catch(() => toast.error('卸载失败')) }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
