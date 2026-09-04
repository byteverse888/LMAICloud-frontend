'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
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
  Bot, Key, Radio, Puzzle, Activity, MemoryStick,
  Cpu, HardDrive, Server, Clock, Wifi, CreditCard, Network,
  Pencil, CheckCircle, XCircle, AlertTriangle,
  RotateCw, ScrollText, Terminal, ChevronRight, ChevronDown, ArrowUpCircle, Save, X,
  Copy, QrCode, KeyRound,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

const WebTerminal = dynamic(
  () => import('@/components/terminal/web-terminal'),
  { ssr: false }
)

import {
  useAgentInstance, useAgentModelKeys, useAgentChannels,
  useAgentSkills, useAgentMonitor, useAgentLogs, useAgentImages, useWeixinQrcode,
  type AgentImageConfig,
} from '@/hooks/use-agents'
import { formatTime } from '@/lib/utils'

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

// 通道类型展示名（一期: qqbot 表单式 / weixin 扫码式）
const channelLabels: Record<string, string> = { qqbot: 'QQ', weixin: '微信' }

// 通道 config 字段展示名（channel_env_template 的键 → 人类可读标签）
const channelFieldLabels: Record<string, string> = {
  app_id: 'App ID',
  client_secret: 'App Secret',
  app_secret: 'App Secret',
  account_id: '账号 ID',
  token: 'Token',
}
const humanizeField = (k: string) =>
  channelFieldLabels[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// 通道类型注册/使用指引
const channelGuides: Record<string, string> = {
  qqbot: '前往 q.qq.com 注册 QQ 机器人，开启 C2C / 群 @-消息 intent 后，填入 App ID 与 App Secret。凭据经环境变量注入，保存后自动滚动重启生效。',
  weixin: '微信通过扫码连接（iLink bot 身份）：私信（DM）可靠，普通微信群消息通常不可达；同一账号仅允许一个网关实例。',
}

// 预置模型列表
const MODEL_PRESETS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'],
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
  zhipu: ['glm-4', 'glm-4-flash', 'glm-3-turbo'],
  anthropic: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  other: [],
}

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const instanceId = params.id as string
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState('overview')
  const { token } = useAuthStore()

  const { instance, loading, refresh, silentRefresh, startInstance, stopInstance, deleteInstance } = useAgentInstance(instanceId)
  const { keys, loading: keysLoading, refresh: refreshKeys, addKey, updateKey, deleteKey } = useAgentModelKeys(instanceId)
  const { channels, loading: channelsLoading, refresh: refreshChannels, addChannel, updateChannel, deleteChannel } = useAgentChannels(instanceId)
  const { skills, loading: skillsLoading, refresh: refreshSkills, installSkill, updateSkill, uninstallSkill } = useAgentSkills(instanceId)
  const { monitorModels, monitorChannels, monitorStatus, loading: monitorLoading, refresh: refreshMonitor } = useAgentMonitor(instanceId)
  const { logs, loading: logsLoading, refresh: refreshLogs } = useAgentLogs(instanceId)
  const { images: agentImages } = useAgentImages()
  const weixin = useWeixinQrcode(instanceId)

  // 镜像 config → capabilities / 通道模板 / dashboard / 端口（instance 无 capabilities，须经镜像查表）
  const imageConfig: AgentImageConfig = useMemo(() => {
    if (!instance?.image_id) return {}
    return agentImages.find(i => i.id === instance.image_id)?.config || {}
  }, [agentImages, instance?.image_id])
  const capabilities = imageConfig.capabilities || {}
  const channelTemplate = imageConfig.channel_env_template || {}
  const channelTypes = useMemo(() => Object.keys(channelTemplate), [channelTemplate])
  const showModels = capabilities.model_keys !== false
  const showChannels = capabilities.channels !== false
  const showSkills = capabilities.skills === true   // 后端默认 false（hermes 技能由实例自管理）
  const showMonitor = capabilities.monitor !== false
  const dashboardCfg = imageConfig.dashboard
  const apiPort = imageConfig.port || instance?.port || 8642
  const dashboardPort = dashboardCfg?.port || 9119
  const appCols = [showModels, showChannels, showSkills].filter(Boolean).length
  const appsGridClass = appCols >= 3 ? 'lg:grid-cols-3' : appCols === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'

  // URL ?tab= 定位初始 Tab（如列表页「应用管理」入口跳 ?tab=apps）；
  // apps/monitor 依赖镜像 capabilities 异步加载，待其可用后再切，避免落到不存在的 Tab
  useEffect(() => {
    if (urlTab === 'apps' && appCols > 0) setActiveTab('apps')
    else if (urlTab === 'monitor' && showMonitor) setActiveTab('monitor')
    else if (urlTab === 'logs' || urlTab === 'overview') setActiveTab(urlTab)
  }, [urlTab, appCols, showMonitor])

  // dashboard basic auth 凭据（平台生成，存于 instance.dashboard_auth JSON 字符串）
  const dashboardAuth = useMemo<{ username?: string; password?: string } | null>(() => {
    if (!instance?.dashboard_auth) return null
    try { return JSON.parse(instance.dashboard_auth) } catch { return null }
  }, [instance?.dashboard_auth])

  // 轮询：实例处于过渡态时每 5s 静默刷新
  const isTransient = instance && ['creating', 'starting', 'stopping', 'releasing'].includes(instance.status)
  useEffect(() => {
    if (!isTransient) return
    const iv = setInterval(silentRefresh, 5000)
    return () => clearInterval(iv)
  }, [isTransient, silentRefresh])

  // 密钥表单（内联三列布局）
  const [keyForm, setKeyForm] = useState({ provider: 'openai', alias: '', api_key: '', base_url: '', model_name: '' })
  const [keySubmitting, setKeySubmitting] = useState(false)
  const [deleteKeyTarget, setDeleteKeyTarget] = useState<string | null>(null)
  const [customModelName, setCustomModelName] = useState(false)
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null)
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [editKeyForm, setEditKeyForm] = useState({ provider: '', model_name: '', api_key: '', base_url: '' })

  // 通道表单（模板驱动：type + 按 channel_env_template 字段收集 → 拼标准 JSON）
  const [channelFormType, setChannelFormType] = useState('')
  const [channelFields, setChannelFields] = useState<Record<string, string>>({})
  const [channelSubmitting, setChannelSubmitting] = useState(false)
  const [deleteChannelTarget, setDeleteChannelTarget] = useState<string | null>(null)
  const [expandedChannelId, setExpandedChannelId] = useState<string | null>(null)
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
  const [editChannelFields, setEditChannelFields] = useState<Record<string, string>>({})

  // 微信扫码弹窗
  const [showWeixinDialog, setShowWeixinDialog] = useState(false)

  // Skill 表单
  const [skillForm, setSkillForm] = useState({ name: '', description: '', version: '' })
  const [skillSubmitting, setSkillSubmitting] = useState(false)
  const [upgradingSkillId, setUpgradingSkillId] = useState<string | null>(null)
  const [upgradeVersion, setUpgradeVersion] = useState('')

  // WebShell 终端
  const [terminalOpen, setTerminalOpen] = useState(false)

  // 监控数据 Map
  const monitorModelMap = useMemo(() => {
    const m = new Map<string, any>()
    monitorModels?.forEach((item: any) => { if (item.key_id) m.set(item.key_id, item) })
    return m
  }, [monitorModels])
  const monitorChannelMap = useMemo(() => {
    const m = new Map<string, any>()
    monitorChannels?.forEach((item: any) => { if (item.channel_id) m.set(item.channel_id, item) })
    return m
  }, [monitorChannels])

  // 通道类型切换：按 channel_env_template 声明的字段初始化表单
  const resetChannelFields = (type: string) => {
    const fields = channelTemplate[type] || {}
    const init: Record<string, string> = {}
    Object.keys(fields).forEach(k => { init[k] = '' })
    setChannelFields(init)
  }
  const handleChannelTypeChange = (t: string) => {
    setChannelFormType(t)
    resetChannelFields(t)
  }
  useEffect(() => {
    if (!channelFormType && channelTypes.length > 0) handleChannelTypeChange(channelTypes[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelTypes])

  // 微信扫码成功后：刷新通道列表与监控
  useEffect(() => {
    if (weixin.session?.status === 'confirmed') {
      refreshChannels()
      refreshMonitor()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weixin.session?.status])

  const copyText = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
      .then(() => toast.success(`${label}已复制`))
      .catch(() => toast.error('复制失败'))
  }

  // ── 实例操作 ──
  const handleStart = async () => { try { await startInstance(); toast.success('启动中'); setTimeout(refresh, 2000) } catch { toast.error('启动失败') } }
  const handleStop = async () => { try { await stopInstance(); toast.success('已停止') } catch { toast.error('停止失败') } }
  const handleDelete = async () => { try { await deleteInstance(); toast.success('删除中'); router.push('/agents') } catch { toast.error('删除失败') } }
  const handleRestart = async () => {
    try { await api.post(`/agents/instances/${instanceId}/restart`); toast.success('重启中'); setTimeout(refresh, 3000) } catch { toast.error('重启失败') }
  }
  const openTerminal = () => {
    if (instance?.status === 'running') setTerminalOpen(true)
    else toast.error('实例未运行，无法打开终端')
  }

  // ── 密钥操作 ──
  const handleAddKey = async () => {
    if (!keyForm.api_key) { toast.error('请输入 API Key'); return }
    try {
      setKeySubmitting(true)
      await addKey(keyForm)
      toast.success('密钥已添加，滚动重启生效中')
      setKeyForm({ provider: 'openai', alias: '', api_key: '', base_url: '', model_name: '' })
    } catch (e: any) { toast.error(e?.response?.data?.detail || '添加失败') }
    finally { setKeySubmitting(false) }
  }
  const handleDeleteKey = async () => {
    if (!deleteKeyTarget) return
    try { await deleteKey(deleteKeyTarget); toast.success('密钥已删除'); setDeleteKeyTarget(null) } catch { toast.error('删除失败') }
  }
  const handleSaveEditKey = async () => {
    if (!editingKeyId) return
    try {
      await updateKey(editingKeyId, {
        ...(editKeyForm.api_key ? { api_key: editKeyForm.api_key } : {}),
        ...(editKeyForm.base_url !== undefined ? { base_url: editKeyForm.base_url } : {}),
        ...(editKeyForm.model_name ? { model_name: editKeyForm.model_name } : {}),
      })
      toast.success('密钥已更新'); setEditingKeyId(null)
    } catch { toast.error('更新失败') }
  }
  const handleToggleKey = async (keyId: string, active: boolean) => {
    try { await updateKey(keyId, { is_active: active }); toast.success(active ? '已启用' : '已禁用') } catch { toast.error('操作失败') }
  }

  // ── 通道操作（表单式：QQ 等；微信走扫码弹窗）──
  const openWeixinDialog = async () => {
    if (instance?.status !== 'running') { toast.error('实例需运行中才能扫码连接微信'); return }
    setShowWeixinDialog(true)
    try { await weixin.start() } catch (e: any) { toast.error(e?.response?.data?.detail || '发起扫码失败') }
  }
  const handleAddChannel = async () => {
    if (!channelFormType) { toast.error('请选择通道类型'); return }
    if (channelFormType === 'weixin') { openWeixinDialog(); return }
    const filled = Object.values(channelFields).some(v => v.trim())
    if (!filled) { toast.error('请填写通道凭据'); return }
    try {
      setChannelSubmitting(true)
      await addChannel({
        type: channelFormType,
        name: channelLabels[channelFormType] || channelFormType,
        config: JSON.stringify(channelFields),
      })
      toast.success('通道已添加，滚动重启生效中')
      resetChannelFields(channelFormType)
    } catch (e: any) { toast.error(e?.response?.data?.detail || '添加失败') }
    finally { setChannelSubmitting(false) }
  }
  const handleDeleteChannel = async () => {
    if (!deleteChannelTarget) return
    try { await deleteChannel(deleteChannelTarget); toast.success('通道已删除'); setDeleteChannelTarget(null) } catch { toast.error('删除失败') }
  }
  const handleToggleChannel = async (chId: string, active: boolean) => {
    try { await updateChannel(chId, { is_active: active }); toast.success(active ? '已启用' : '已禁用') } catch { toast.error('操作失败') }
  }
  const startEditChannel = (chId: string, type: string, config?: string) => {
    let parsed: Record<string, string> = {}
    if (config) { try { parsed = JSON.parse(config) } catch { parsed = {} } }
    const fields = channelTemplate[type] || {}
    const init: Record<string, string> = {}
    Object.keys(fields).forEach(k => { init[k] = parsed[k] || '' })
    setEditChannelFields(init)
    setEditingChannelId(chId)
  }
  const handleSaveEditChannel = async () => {
    if (!editingChannelId) return
    try {
      await updateChannel(editingChannelId, { config: JSON.stringify(editChannelFields) })
      toast.success('通道已更新，滚动重启生效中'); setEditingChannelId(null)
    } catch (e: any) { toast.error(e?.response?.data?.detail || '更新失败') }
  }

  // ── Skill 操作 ──
  const handleInstallSkill = async () => {
    if (!skillForm.name) { toast.error('请输入技能名称'); return }
    try {
      setSkillSubmitting(true)
      await installSkill(skillForm)
      toast.success('技能安装中')
      setSkillForm({ name: '', description: '', version: '' })
    } catch (e: any) { toast.error(e?.response?.data?.detail || '安装失败') }
    finally { setSkillSubmitting(false) }
  }
  const handleUpgradeSkill = async (skillId: string) => {
    if (!upgradeVersion.trim()) { toast.error('请输入版本号'); return }
    try { await updateSkill(skillId, { version: upgradeVersion.trim() }); toast.success('升级中'); setUpgradingSkillId(null); setUpgradeVersion('') } catch { toast.error('升级失败') }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }
  if (!instance) {
    return <div className="text-center py-20 text-muted-foreground">实例不存在或已被删除</div>
  }

  const apiEndpoint = instance.internal_ip ? `http://${instance.internal_ip}:${apiPort}` : ''
  const dashboardEndpoint = instance.internal_ip ? `http://${instance.internal_ip}:${dashboardPort}` : ''
  const depInfo = instance.deployment_info
  const podList = instance.pod_info || []

  return (
    <div className="space-y-6">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/agents')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> {instance.name}
              <span className="ml-1">{getStatusBadge(instance.status)}</span>
              {(instance.image_name || instance.agent_type) && (
                <Badge variant="outline" className="ml-1 gap-1 font-normal">
                  {instance.image_icon ? <span>{instance.image_icon}</span> : <Bot className="h-3 w-3" />}
                  {instance.image_name || instance.agent_type}
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {instance.id}
              {instance.deployment_name && <> · Deployment: <code className="bg-muted/50 px-1 rounded">{instance.deployment_name}</code></>}
              {(instance.pod_node_name || instance.node_name) && <> · 节点: <code className="bg-muted/50 px-1 rounded">{instance.pod_node_name || instance.node_name}</code></>}
            </p>
          </div>
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><Server className="h-3.5 w-3.5" /> 概览</TabsTrigger>
          {appCols > 0 && <TabsTrigger value="apps" className="gap-1"><Bot className="h-3.5 w-3.5" /> 应用管理</TabsTrigger>}
          {showMonitor && <TabsTrigger value="monitor" className="gap-1"><Activity className="h-3.5 w-3.5" /> 监控</TabsTrigger>}
          <TabsTrigger value="logs" className="gap-1"><ScrollText className="h-3.5 w-3.5" /> 日志</TabsTrigger>
        </TabsList>

        {/* ===== 概览 ===== */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deployment 运行状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Deployment 状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deployment</span>
                  <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{depInfo?.name || instance.deployment_name || '-'}</code>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">副本就绪</span>
                  <span className="font-medium">{depInfo ? `${depInfo.ready_replicas ?? 0} / ${depInfo.replicas ?? 0}` : '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground shrink-0">镜像</span>
                  <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate max-w-[260px]" title={instance.image_url || '-'}>{instance.image_url || '-'}</code>
                </div>
                {podList.length > 0 && (
                  <>
                    <Separator />
                    {podList.map((pod, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground shrink-0">关联 Pod</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate max-w-[180px]" title={pod.name}>{pod.name}</code>
                          <Badge variant={pod.status === 'Running' ? 'success' : pod.status === 'Pending' ? 'outline' : 'destructive'} className="text-xs shrink-0">
                            {pod.status}
                          </Badge>
                          {(pod.restart_count ?? 0) > 0 && <span className="text-xs text-amber-500 shrink-0">重启: {pod.restart_count}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 创建时间</span><span>{instance.created_at ? formatTime(instance.created_at) : '-'}</span></div>
              </CardContent>
            </Card>

            {/* 资源 & 连接 */}
            <Card>
              <CardHeader><CardTitle className="text-base">资源 & 连接</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> CPU</span><span>{instance.cpu_cores} 核</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><MemoryStick className="h-3.5 w-3.5" /> 内存</span><span>{instance.memory_gb} GB</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" /> 数据盘</span><span>{instance.disk_gb} GB</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Network className="h-3.5 w-3.5" /> API 端口</span><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{apiPort}</code></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /> 内网 IP</span><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{instance.internal_ip || '-'}</code></div>
              </CardContent>
            </Card>

            {/* 访问信息（API 端点 + 访问令牌 / Dashboard + basic auth） */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> 访问信息</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* API Server */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium flex items-center gap-1.5"><Server className="h-4 w-4 text-muted-foreground" /> API 端点（OpenAI 兼容，端口 {apiPort}）</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">地址</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate">{apiEndpoint || '实例启动后分配'}</code>
                      {apiEndpoint && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyText(apiEndpoint, 'API 地址')}><Copy className="h-3 w-3" /></Button>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">访问令牌</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate">{instance.gateway_token || '-'}</code>
                      {instance.gateway_token && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyText(instance.gateway_token!, '访问令牌')}><Copy className="h-3 w-3" /></Button>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">调用时在请求头携带 <code className="bg-muted/50 px-1 rounded">Authorization: Bearer &lt;访问令牌&gt;</code>。</p>
                </div>

                {/* Dashboard */}
                {dashboardCfg?.enabled && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="font-medium flex items-center gap-1.5"><Activity className="h-4 w-4 text-muted-foreground" /> Dashboard 控制台（端口 {dashboardPort}）</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">地址</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate">{dashboardEndpoint || '实例启动后分配'}</code>
                        {dashboardEndpoint && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyText(dashboardEndpoint, 'Dashboard 地址')}><Copy className="h-3 w-3" /></Button>}
                      </div>
                    </div>
                    {dashboardAuth ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">用户名</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate">{dashboardAuth.username || '-'}</code>
                            {dashboardAuth.username && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyText(dashboardAuth.username!, '用户名')}><Copy className="h-3 w-3" /></Button>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">密码</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono truncate">{dashboardAuth.password || '-'}</code>
                            {dashboardAuth.password && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyText(dashboardAuth.password!, '密码')}><Copy className="h-3 w-3" /></Button>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">首次登录请及时修改密码；凭据由平台生成并注入实例。</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Dashboard 凭据将在实例创建后生成。</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 计费信息 */}
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
                    <p className="text-sm font-medium">{instance.expired_at ? formatTime(instance.expired_at) : '无（按量）'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== 应用管理（按 capabilities 条件渲染：模型 / 通道 / 技能） ===== */}
        {appCols > 0 && (
        <TabsContent value="apps">
          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-700 dark:text-blue-300 space-y-0.5 flex-1">
                  <p>1. 请保护好 API Key 与通道凭据，避免泄漏造成额外损失。</p>
                  <p>2. 智能体调用模型时会携带较多上下文，Token 消耗可能较高，请关注用量与计费情况。</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { refreshKeys(); refreshChannels(); refreshSkills(); refreshMonitor() }} disabled={keysLoading || channelsLoading || skillsLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${keysLoading || channelsLoading || skillsLoading ? 'animate-spin' : ''}`} /> 刷新
                </Button>
              </div>

              <div className={`grid grid-cols-1 ${appsGridClass} gap-6`}>
                {/* ── 模型 (Models) ── */}
                {showModels && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Key className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold">模型 (Models)</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <Select value={keyForm.provider} onValueChange={v => { setKeyForm(f => ({ ...f, provider: v, model_name: '' })); setCustomModelName(false) }}>
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
                    {customModelName || (MODEL_PRESETS[keyForm.provider]?.length === 0) ? (
                      <div className="flex gap-1">
                        <Input placeholder="输入模型名称" value={keyForm.model_name} onChange={e => setKeyForm(f => ({ ...f, model_name: e.target.value }))} />
                        {(MODEL_PRESETS[keyForm.provider]?.length ?? 0) > 0 && (
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setCustomModelName(false); setKeyForm(f => ({ ...f, model_name: '' })) }}><X className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ) : (
                      <Select value={keyForm.model_name} onValueChange={v => { if (v === '__custom__') { setCustomModelName(true); setKeyForm(f => ({ ...f, model_name: '' })) } else { setKeyForm(f => ({ ...f, model_name: v })) } }}>
                        <SelectTrigger><SelectValue placeholder="选择模型" /></SelectTrigger>
                        <SelectContent>
                          {(MODEL_PRESETS[keyForm.provider] || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          <SelectItem value="__custom__">自定义...</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input placeholder="API Key" type="password" value={keyForm.api_key} onChange={e => setKeyForm(f => ({ ...f, api_key: e.target.value }))} />
                    <Button className="w-full" variant="outline" onClick={handleAddKey} disabled={keySubmitting}>
                      {keySubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      一键添加并应用
                    </Button>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {keyForm.provider === 'openai' ? 'OpenAI GPT 系列模型，全球领先的 AI 大模型服务。'
                        : keyForm.provider === 'deepseek' ? 'DeepSeek 模型服务，提供高性价比的 AI 推理能力。'
                        : keyForm.provider === 'qwen' ? '通义千问，阿里云大模型服务。'
                        : keyForm.provider === 'zhipu' ? '智谱 AI GLM 系列模型。'
                        : keyForm.provider === 'anthropic' ? 'Anthropic Claude 系列模型。'
                        : '自定义模型服务，支持 OpenAI 兼容 API。'}
                    </p>
                  </div>
                  {/* 切换模型 - 折叠展开式 */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">切换模型</p>
                    {keysLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : keys.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {keys.map(k => {
                          const isExpanded = expandedKeyId === k.id
                          const isEditing = editingKeyId === k.id
                          const mon = monitorModelMap.get(k.id)
                          const checkStatus = mon?.check_status || k.check_status
                          return (
                            <div key={k.id} className="bg-muted/30 rounded-md">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm">
                                <button className="shrink-0 p-0.5" onClick={() => setExpandedKeyId(isExpanded ? null : k.id)}>
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                                <span className="font-medium truncate flex-1">{k.provider}/{k.model_name || '-'}</span>
                                <span className={`text-xs flex items-center gap-1 shrink-0 ${k.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${k.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                  {k.is_active ? '应用中' : '未应用'}
                                </span>
                                <Switch checked={k.is_active} onCheckedChange={(v) => handleToggleKey(k.id, v)} className="scale-75" />
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setDeleteKeyTarget(k.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {isExpanded && (
                                <div className="px-3 pb-3 text-xs space-y-1.5 border-t mx-2 pt-2">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <Input size={1} placeholder="API Key" type="password" value={editKeyForm.api_key} onChange={e => setEditKeyForm(f => ({ ...f, api_key: e.target.value }))} className="h-7 text-xs" />
                                      <Input size={1} placeholder="Base URL (可选)" value={editKeyForm.base_url} onChange={e => setEditKeyForm(f => ({ ...f, base_url: e.target.value }))} className="h-7 text-xs" />
                                      <Input size={1} placeholder="模型名" value={editKeyForm.model_name} onChange={e => setEditKeyForm(f => ({ ...f, model_name: e.target.value }))} className="h-7 text-xs" />
                                      <div className="flex gap-2">
                                        <Button size="sm" className="h-6 text-xs" onClick={handleSaveEditKey}><Save className="h-3 w-3 mr-1" />保存</Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingKeyId(null)}>取消</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex justify-between"><span className="text-muted-foreground">API Key</span><span className="font-mono">{k.api_key_masked || 'sk-***'}</span></div>
                                      {k.base_url && <div className="flex justify-between"><span className="text-muted-foreground">Base URL</span><span className="font-mono truncate max-w-[160px]" title={k.base_url}>{k.base_url}</span></div>}
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">状态</span>
                                        <span className={`font-medium ${checkStatus === 'ok' ? 'text-emerald-600' : checkStatus === 'error' ? 'text-red-500' : ''}`}>
                                          {checkStatus === 'ok' ? <><CheckCircle className="h-3 w-3 inline mr-0.5" />正常</> : checkStatus === 'error' ? <><XCircle className="h-3 w-3 inline mr-0.5" />异常</> : '-'}
                                        </span>
                                      </div>
                                      {(mon?.balance ?? k.balance) != null && <div className="flex justify-between"><span className="text-muted-foreground">余额</span><span>${(mon?.balance ?? k.balance)?.toFixed(2)}</span></div>}
                                      {(mon?.tokens_used ?? k.tokens_used) != null && <div className="flex justify-between"><span className="text-muted-foreground">Token 用量</span><span>{mon?.tokens_used ?? k.tokens_used}</span></div>}
                                      <Separator />
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setEditingKeyId(k.id); setEditKeyForm({ provider: k.provider, model_name: k.model_name || '', api_key: '', base_url: k.base_url || '' }) }}>
                                          <Pencil className="h-3 w-3 mr-1" />编辑
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* ── 通道 (Channels)：qqbot 表单式 / weixin 扫码式，类型来自镜像 config ── */}
                {showChannels && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Radio className="h-4 w-4 text-green-500" />
                    <h3 className="font-semibold">通道 (Channels)</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    {channelTypes.length > 0 ? (
                      <>
                        <Select value={channelFormType} onValueChange={handleChannelTypeChange}>
                          <SelectTrigger><SelectValue placeholder="选择通道类型" /></SelectTrigger>
                          <SelectContent>
                            {channelTypes.map(t => <SelectItem key={t} value={t}>{channelLabels[t] || t}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        {channelFormType === 'weixin' ? (
                          <Button className="w-full" variant="outline" onClick={openWeixinDialog} disabled={weixin.starting}>
                            {weixin.starting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                            连接微信（扫码）
                          </Button>
                        ) : (
                          <>
                            {Object.keys(channelTemplate[channelFormType] || {}).map(field => (
                              <Input
                                key={field}
                                placeholder={humanizeField(field)}
                                type={/secret|token|key/i.test(field) ? 'password' : 'text'}
                                value={channelFields[field] || ''}
                                onChange={e => setChannelFields(f => ({ ...f, [field]: e.target.value }))}
                              />
                            ))}
                            <Button className="w-full" variant="outline" onClick={handleAddChannel} disabled={channelSubmitting}>
                              {channelSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              添加并应用
                            </Button>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {channelGuides[channelFormType] || '接入通道，开启您的个性化机器人之旅。'}
                          {channelFormType === 'qqbot' && (
                            <a href="https://q.qq.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5 ml-1">注册指引 <ExternalLink className="h-3 w-3" /></a>
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">该智能体镜像未声明可用通道类型。</p>
                    )}
                  </div>
                  {/* 已接入通道 - 折叠展开式 */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">已接入通道</p>
                    {channelsLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : channels.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {channels.map(ch => {
                          const isExpanded = expandedChannelId === ch.id
                          const isEditing = editingChannelId === ch.id
                          const mon = monitorChannelMap.get(ch.id)
                          const onlineStatus = mon?.online_status || ch.online_status
                          const isWeixin = ch.type === 'weixin'
                          let weixinAccount = '-'
                          if (isWeixin && ch.config) { try { weixinAccount = JSON.parse(ch.config).account_id || '-' } catch { weixinAccount = '-' } }
                          return (
                            <div key={ch.id} className="bg-muted/30 rounded-md">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm">
                                <button className="shrink-0 p-0.5" onClick={() => setExpandedChannelId(isExpanded ? null : ch.id)}>
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                                <Badge variant="outline" className="text-xs shrink-0">{channelLabels[ch.type] || ch.type}</Badge>
                                <span className="truncate flex-1">{ch.name || '-'}</span>
                                <span className={`text-xs flex items-center gap-1 shrink-0 ${onlineStatus === 'online' ? 'text-emerald-600' : onlineStatus === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${onlineStatus === 'online' ? 'bg-emerald-500' : onlineStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                  {onlineStatus === 'online' ? '运行中' : onlineStatus === 'error' ? '异常' : '离线'}
                                </span>
                                <Switch checked={ch.is_active} onCheckedChange={(v) => handleToggleChannel(ch.id, v)} className="scale-75" />
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setDeleteChannelTarget(ch.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {isExpanded && (
                                <div className="px-3 pb-3 text-xs space-y-1.5 border-t mx-2 pt-2">
                                  {isWeixin ? (
                                    <>
                                      <div className="flex justify-between"><span className="text-muted-foreground">连接方式</span><span>微信扫码</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">账号 ID</span><span className="font-mono truncate max-w-[160px]">{weixinAccount}</span></div>
                                      {ch.last_check_at && <div className="flex justify-between"><span className="text-muted-foreground">最近检测</span><span>{formatTime(ch.last_check_at)}</span></div>}
                                      <Separator />
                                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={openWeixinDialog}>
                                        <QrCode className="h-3 w-3 mr-1" />重新扫码
                                      </Button>
                                    </>
                                  ) : isEditing ? (
                                    <div className="space-y-2">
                                      {Object.keys(channelTemplate[ch.type] || {}).map(field => (
                                        <Input key={field} size={1} placeholder={humanizeField(field)} type={/secret|token|key/i.test(field) ? 'password' : 'text'} value={editChannelFields[field] || ''} onChange={e => setEditChannelFields(f => ({ ...f, [field]: e.target.value }))} className="h-7 text-xs" />
                                      ))}
                                      <div className="flex gap-2">
                                        <Button size="sm" className="h-6 text-xs" onClick={handleSaveEditChannel}><Save className="h-3 w-3 mr-1" />保存</Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingChannelId(null)}>取消</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex justify-between"><span className="text-muted-foreground">名称</span><span>{ch.name || '-'}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">凭据</span><span className="font-mono">******</span></div>
                                      {ch.last_check_at && <div className="flex justify-between"><span className="text-muted-foreground">最近检测</span><span>{formatTime(ch.last_check_at)}</span></div>}
                                      <Separator />
                                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => startEditChannel(ch.id, ch.type, ch.config)}>
                                        <Pencil className="h-3 w-3 mr-1" />更新凭据
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* ── 技能 (Skills)：仅镜像声明 capabilities.skills 时开放 ── */}
                {showSkills && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Puzzle className="h-4 w-4 text-purple-500" />
                    <h3 className="font-semibold">技能 (Skills)</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-8" placeholder="请输入 Skill 名称" value={skillForm.name} onChange={e => setSkillForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleInstallSkill() }} />
                    </div>
                    <Button className="w-full" variant="outline" onClick={handleInstallSkill} disabled={skillSubmitting}>
                      {skillSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      安装技能
                    </Button>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">已安装技能</p>
                    <div className="border-b border-dashed mb-2" />
                    {skillsLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : skills.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {skills.map(skill => {
                          const statusCfg: Record<string, { color: string; label: string; spin?: boolean }> = {
                            installed: { color: 'text-emerald-600', label: '已安装' },
                            installing: { color: 'text-blue-500', label: '安装中', spin: true },
                            uninstalling: { color: 'text-amber-500', label: '卸载中', spin: true },
                            error: { color: 'text-red-500', label: '异常' },
                          }
                          const sc = statusCfg[skill.status] || { color: 'text-muted-foreground', label: skill.status }
                          return (
                            <div key={skill.id} className="bg-muted/30 rounded-md px-2.5 py-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 truncate flex-1">
                                  <span className="font-medium truncate">{skill.name}</span>
                                  {skill.version && <span className="text-xs text-muted-foreground">{skill.version}</span>}
                                  <span className={`text-xs flex items-center gap-1 ${sc.color}`}>
                                    {sc.spin && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {sc.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {skill.status === 'installed' && (
                                    upgradingSkillId === skill.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input size={1} placeholder="新版本" value={upgradeVersion} onChange={e => setUpgradeVersion(e.target.value)} className="h-6 w-20 text-xs" onKeyDown={e => { if (e.key === 'Enter') handleUpgradeSkill(skill.id) }} />
                                        <Button size="icon" className="h-6 w-6" onClick={() => handleUpgradeSkill(skill.id)}><Save className="h-3 w-3" /></Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setUpgradingSkillId(null); setUpgradeVersion('') }}><X className="h-3 w-3" /></Button>
                                      </div>
                                    ) : (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500" title="升级" onClick={() => { setUpgradingSkillId(skill.id); setUpgradeVersion(skill.version || '') }}>
                                        <ArrowUpCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    )
                                  )}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => { uninstallSkill(skill.name).then(() => toast.success('卸载中')).catch(() => toast.error('卸载失败')) }}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {skill.description && <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ===== 监控（按 capabilities.monitor 条件渲染） ===== */}
        {showMonitor && (
        <TabsContent value="monitor">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> CPU 使用率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>当前使用</span>
                      <span className="font-medium">
                        {monitorStatus?.cpu_usage_millicores != null
                          ? monitorStatus.cpu_usage_millicores < 1000
                            ? `${monitorStatus.cpu_usage_millicores}m`
                            : `${(monitorStatus.cpu_usage_millicores / 1000).toFixed(1)} 核`
                          : '-'}
                        {` / ${monitorStatus?.cpu_cores || instance.cpu_cores} 核`}
                      </span>
                    </div>
                    <Progress
                      value={monitorStatus?.cpu_usage_millicores != null && (monitorStatus?.cpu_cores || instance.cpu_cores)
                        ? Math.min(100, monitorStatus.cpu_usage_millicores / ((monitorStatus.cpu_cores || instance.cpu_cores) * 1000) * 100)
                        : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><MemoryStick className="h-4 w-4 text-primary" /> 内存使用率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>当前使用</span>
                      <span className="font-medium">
                        {monitorStatus?.memory_usage_bytes != null
                          ? monitorStatus.memory_usage_bytes < 1024 * 1024 * 1024
                            ? `${(monitorStatus.memory_usage_bytes / (1024 * 1024)).toFixed(0)} Mi`
                            : `${(monitorStatus.memory_usage_bytes / (1024 * 1024 * 1024)).toFixed(1)} Gi`
                          : '-'}
                        {(monitorStatus?.memory_gb || instance.memory_gb) ? ` / ${monitorStatus?.memory_gb || instance.memory_gb} Gi` : ''}
                      </span>
                    </div>
                    <Progress
                      value={monitorStatus?.memory_usage_bytes != null && (monitorStatus?.memory_gb || instance.memory_gb)
                        ? Math.min(100, monitorStatus.memory_usage_bytes / ((monitorStatus.memory_gb || instance.memory_gb) * 1024 * 1024 * 1024) * 100)
                        : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

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
                      <p className="text-xs text-muted-foreground mb-1">模型密钥</p>
                      <p className="text-2xl font-bold text-primary">{monitorStatus.model_keys_ok ?? '-'}{monitorStatus.model_keys_total != null ? ` / ${monitorStatus.model_keys_total}` : ''}</p>
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
          </div>
        </TabsContent>
        )}

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

      {/* ===== 微信扫码连接弹窗 ===== */}
      <Dialog open={showWeixinDialog} onOpenChange={(o) => { setShowWeixinDialog(o); if (!o) weixin.stopPolling() }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> 连接微信</DialogTitle>
            <DialogDescription>使用个人微信扫码登录，凭据将安全保存至实例数据盘。</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {(() => {
              const s = weixin.session
              if (!s || (s.status === 'pending' && !s.qrcode_url)) {
                return <div className="flex flex-col items-center gap-2 py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm text-muted-foreground">正在获取二维码…</p></div>
              }
              if (s.status === 'failed') {
                return (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <p className="text-sm">{s.message || '扫码失败'}</p>
                    <p className="text-xs text-muted-foreground">可前往实例 Dashboard 内完成微信连接。</p>
                    <Button variant="outline" size="sm" onClick={() => weixin.start()}><RotateCw className="h-3.5 w-3.5 mr-1" />重试</Button>
                  </div>
                )
              }
              if (s.status === 'confirmed') {
                return (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CheckCircle className="h-10 w-10 text-emerald-500" />
                    <p className="text-sm font-medium">微信连接成功</p>
                    <p className="text-xs text-muted-foreground">通道已自动写入，正在滚动重启生效。</p>
                  </div>
                )
              }
              return (
                <>
                  <div className="p-2 bg-white rounded-lg border">
                    {s.qrcode_url
                      ? <QRCodeSVG value={s.qrcode_url} size={200} />
                      : <div className="w-[200px] h-[200px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                  </div>
                  <p className={`text-sm text-center ${s.status === 'expired' ? 'text-amber-500' : s.status === 'scanned' ? 'text-blue-500' : ''}`}>
                    {s.status === 'scanned' ? '已扫码，请在手机上确认登录' : s.status === 'expired' ? (s.message || '二维码已过期') : (s.message || '请使用个人微信扫码')}
                  </p>
                  {s.status === 'expired' && (
                    <Button variant="outline" size="sm" onClick={() => weixin.start()}><RotateCw className="h-3.5 w-3.5 mr-1" />刷新二维码</Button>
                  )}
                </>
              )
            })()}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{channelGuides.weixin}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowWeixinDialog(false); weixin.stopPolling() }}>
              {weixin.session?.status === 'confirmed' ? '完成' : '关闭'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 删除密钥确认 ===== */}
      <AlertDialog open={!!deleteKeyTarget} onOpenChange={open => { if (!open) setDeleteKeyTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除密钥</AlertDialogTitle>
            <AlertDialogDescription>确定要删除该密钥吗？删除后智能体将无法使用此 Provider。</AlertDialogDescription>
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
            <AlertDialogDescription>确定要删除该通道吗？删除后将重新下发配置并滚动重启。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChannel} className="bg-red-600 hover:bg-red-700 text-white">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== WebShell 终端弹窗 ===== */}
      <Dialog open={terminalOpen} onOpenChange={setTerminalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">智能体终端</DialogTitle>
          {terminalOpen && token && (
            <WebTerminal
              instanceId={instanceId}
              token={token}
              instanceName={instance?.name}
              wsPath="/ws/agents/terminal"
              onClose={() => setTerminalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
