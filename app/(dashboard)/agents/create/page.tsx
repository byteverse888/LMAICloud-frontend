'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Bot, Check, ChevronRight, Loader2,
  Key, Radio, Trash2, Settings2, ExternalLink,
  Cpu, HardDrive, Zap, CreditCard, Calendar, FolderInput,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAgentImages, type AgentImage } from '@/hooks/use-agents'
import api from '@/lib/api'
import toast from 'react-hot-toast'

// ====== 边缘节点列表 Hook ======
function useEdgeNodes() {
  const [nodes, setNodes] = useState<{ name: string; status: string; ip?: string }[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const { data } = await api.get<{ list: { name: string; status: string; ip?: string }[] }>('/agents/edge-nodes')
        if (!cancelled) setNodes(data.list || [])
      } catch {
        if (!cancelled) setNodes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])
  return { nodes, loading }
}

// ====== 规格定义（CPU/内存，磁盘单独可调）======
interface AgentSpec {
  cpu: number; memory: number
  label: string; desc: string; hourlyPrice: number
}
const agentSpecs: AgentSpec[] = [
  { cpu: 1, memory: 2, label: '入门型', desc: '轻量测试', hourlyPrice: 0.06 },
  { cpu: 2, memory: 4, label: '通用型', desc: '日常使用', hourlyPrice: 0.12 },
  { cpu: 4, memory: 8, label: '专业型', desc: '多模型并发', hourlyPrice: 0.24 },
  { cpu: 8, memory: 16, label: '旗舰型', desc: '高负载生产', hourlyPrice: 0.48 },
]

// ====== 计费模式 ======
const billingOptions = [
  { id: 'hourly', label: '按量计费', icon: Zap, desc: '按小时计费，随用随停' },
  { id: 'monthly', label: '包月', icon: Calendar, desc: '按月预付，更优惠' },
  { id: 'yearly', label: '包年', icon: CreditCard, desc: '按年预付，最优惠' },
]
const monthDurations = [
  { value: 1, label: '1个月' },
  { value: 3, label: '3个月', discount: '9.5折' },
  { value: 6, label: '6个月', discount: '9折' },
  { value: 12, label: '12个月', discount: '8.5折' },
]

// ====== Provider 预设 ======
interface ProviderPreset {
  id: string; name: string; defaultBase: string; placeholder: string; models: string[]
}
const providerPresets: ProviderPreset[] = [
  { id: 'openai', name: 'OpenAI', defaultBase: 'https://api.openai.com/v1', placeholder: 'sk-...', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'o1-preview'] },
  { id: 'anthropic', name: 'Anthropic', defaultBase: 'https://api.anthropic.com', placeholder: 'sk-ant-...', models: ['claude-3-5-sonnet', 'claude-3-5-haiku'] },
  { id: 'deepseek', name: 'DeepSeek', defaultBase: 'https://api.deepseek.com/v1', placeholder: 'sk-...', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { id: 'qwen', name: '通义千问', defaultBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1', placeholder: 'sk-...', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
  { id: 'zhipu', name: '智谱 AI', defaultBase: 'https://open.bigmodel.cn/api/paas/v4', placeholder: '...', models: ['glm-4', 'glm-4-flash', 'glm-3-turbo'] },
  { id: 'other', name: '自定义', defaultBase: '', placeholder: 'API Key', models: [] },
]
const providerDescs: Record<string, string> = {
  openai: 'OpenAI GPT系列模型，全球领先的AI大模型服务。',
  anthropic: 'Anthropic Claude 系列模型。',
  deepseek: 'DeepSeek模型服务，提供高性价比的AI推理能力。',
  qwen: '通义千问，阿里云大模型服务，集成多种AI能力。',
  zhipu: '智谱AI GLM系列模型，国产大模型领先者。',
  other: '自定义模型服务，支持OpenAI兼容API的任意模型提供商。',
}

// 通道类型展示名（一期: qqbot 表单式；weixin 需创建后扫码连接）
const channelLabels: Record<string, string> = { qqbot: 'QQ', weixin: '微信' }

// ====== ModelKey 表单项 ======
interface ModelKeyItem {
  provider: string; alias: string; api_key: string; base_url: string; model_name: string
}
const emptyKey = (): ModelKeyItem => ({ provider: 'openai', alias: '', api_key: '', base_url: '', model_name: '' })

// ====== Channel 表单项（config 为标准 JSON 字符串）======
interface ChannelItem { type: string; name: string; config: string }

export default function AgentsCreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetImageId = searchParams.get('imageId') || ''
  const { images: agentImages, loading: imagesLoading } = useAgentImages()

  // ── 表单状态 ──
  const [billingType, setBillingType] = useState('hourly')
  const [durationMonths, setDurationMonths] = useState(1)
  const [selectedSpec, setSelectedSpec] = useState<AgentSpec>(agentSpecs[1])
  const [diskGb, setDiskGb] = useState(50)  // 数据盘默认 50G，可调
  const [dataMountPath, setDataMountPath] = useState('/opt/data')  // 数据盘容器内挂载点，默认 /opt/data（智能体数据目录），可改
  const [selectedImageId, setSelectedImageId] = useState('')
  const [instanceName, setInstanceName] = useState('')
  const [nodeType, setNodeType] = useState('center')
  const [nodeName, setNodeName] = useState('')
  const [port, setPort] = useState(8642)
  const [customImageUrl, setCustomImageUrl] = useState('')

  const selectedImage: AgentImage | undefined = useMemo(
    () => agentImages.find(i => i.id === selectedImageId),
    [agentImages, selectedImageId]
  )
  const capabilities = selectedImage?.config.capabilities || {}
  const channelTemplate = selectedImage?.config.channel_env_template || {}
  // 创建时可表单预配的通道类型（微信为扫码式，需实例运行后连接，故排除）
  const creatableChannelTypes = useMemo(
    () => Object.keys(channelTemplate).filter(t => t !== 'weixin'),
    [channelTemplate]
  )
  const showModels = capabilities.model_keys !== false
  const showChannels = capabilities.channels !== false && creatableChannelTypes.length > 0

  // 选中镜像：带出端口默认值
  const handleSelectImage = (img: AgentImage) => {
    setSelectedImageId(img.id)
    if (img.config.port) setPort(img.config.port)
    // 挂载路径默认带出镜像声明的 data_mount_path（无则 /opt/data），用户仍可改
    setDataMountPath(img.config.data_mount_path || '/opt/data')
  }

  // 镜像只有一个时自动选中，或通过 URL 参数自动选中
  useEffect(() => {
    if (agentImages.length === 0) return
    if (presetImageId) {
      const match = agentImages.find(img => img.id === presetImageId)
      if (match && !selectedImageId) handleSelectImage(match)
    } else if (agentImages.length === 1 && !selectedImageId) {
      handleSelectImage(agentImages[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentImages, presetImageId])

  // 边缘节点列表
  const { nodes: edgeNodes, loading: edgeLoading } = useEdgeNodes()

  const handleNodeTypeChange = (v: string) => {
    setNodeType(v)
    if (v === 'center') setNodeName('')
  }

  // 模型/通道 — 表单 + 已添加列表
  const [modelKeys, setModelKeys] = useState<ModelKeyItem[]>([])
  const [mkForm, setMkForm] = useState<ModelKeyItem>(emptyKey())
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [chType, setChType] = useState('')
  const [chFields, setChFields] = useState<Record<string, string>>({})

  // 高级选项
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [creating, setCreating] = useState(false)

  // 通道类型切换：按 channel_env_template 声明的字段初始化表单
  const handleChannelTypeChange = (t: string) => {
    setChType(t)
    const fields = channelTemplate[t] || {}
    const init: Record<string, string> = {}
    Object.keys(fields).forEach(k => { init[k] = '' })
    setChFields(init)
  }
  useEffect(() => {
    if (!chType && creatableChannelTypes.length > 0) handleChannelTypeChange(creatableChannelTypes[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatableChannelTypes])

  // ── 价格计算 ──
  const hourlyPrice = selectedSpec.hourlyPrice
  const monthlyPrice = hourlyPrice * 24 * 30
  const yearlyPrice = hourlyPrice * 24 * 365

  const estimatedCost = useMemo(() => {
    if (billingType === 'hourly') return { price: hourlyPrice, unit: '/时', total: null as number | null }
    if (billingType === 'monthly') {
      const discount = durationMonths >= 12 ? 0.85 : durationMonths >= 6 ? 0.9 : durationMonths >= 3 ? 0.95 : 1
      const total = monthlyPrice * durationMonths * discount
      return { price: monthlyPrice * discount, unit: '/月', total }
    }
    const total = yearlyPrice * 0.8
    return { price: yearlyPrice * 0.8, unit: '/年', total }
  }, [billingType, hourlyPrice, durationMonths, monthlyPrice, yearlyPrice])

  const getPreset = (id: string) => providerPresets.find(p => p.id === id) || providerPresets[providerPresets.length - 1]

  const handleAddModelKey = () => {
    if (!mkForm.api_key.trim()) { toast.error('请输入 API Key'); return }
    setModelKeys(prev => [...prev, { ...mkForm }])
    setMkForm(emptyKey())
    toast.success('模型已添加')
  }
  const handleAddChannel = () => {
    if (!chType) return
    const filled = Object.values(chFields).some(v => v.trim())
    if (!filled) { toast.error('请填写通道凭据'); return }
    setChannels(prev => [...prev, {
      type: chType,
      name: channelLabels[chType] || chType,
      config: JSON.stringify(chFields),
    }])
    handleChannelTypeChange(chType)  // 重置表单
    toast.success('通道已添加')
  }

  // ── 提交 ──
  const handleCreate = async () => {
    if (!instanceName.trim()) { toast.error('请输入实例名称'); return }
    if (!selectedImageId) { toast.error('请选择智能体'); return }
    const validKeys = modelKeys.filter(k => k.api_key.trim())

    try {
      setCreating(true)
      const body: any = {
        name: instanceName.trim(),
        image_id: selectedImageId,
        node_type: nodeType,
        cpu_cores: selectedSpec.cpu,
        memory_gb: selectedSpec.memory,
        disk_gb: diskGb,
        data_mount_path: dataMountPath.trim() || '/opt/data',
        billing_type: billingType,
      }
      if (port) body.port = port
      if (customImageUrl.trim()) body.image_url = customImageUrl.trim()
      if (nodeType === 'edge') {
        if (!nodeName) { toast.error('请选择边缘节点'); setCreating(false); return }
        body.node_name = nodeName
      }
      if (billingType === 'monthly') body.duration_months = durationMonths
      if (validKeys.length > 0) {
        body.model_keys = validKeys.map(k => ({
          provider: k.provider,
          alias: k.alias || undefined,
          api_key: k.api_key,
          base_url: k.base_url || undefined,
          model_name: k.model_name || undefined,
        }))
      }
      if (channels.length > 0) {
        body.channels = channels.map(c => ({ type: c.type, name: c.name || undefined, config: c.config }))
      }

      await api.post('/agents/instances', body)
      toast.success('实例创建中')
      router.push('/agents')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/agents')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> 创建智能体实例
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">选择智能体镜像并配置运行规格</p>
        </div>
      </div>

      {/* 主体：左配置 + 右费用 */}
      <div className="flex gap-6 items-start">
        {/* ===== 左侧配置区 ===== */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── 1. 选择智能体 ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">选择智能体</h3>
              </div>
              {imagesLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin" /> 加载智能体镜像...
                </div>
              ) : agentImages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  暂无可用智能体镜像，请联系管理员在「镜像管理」中预置（分类=智能体）
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {agentImages.map(img => {
                    const sel = selectedImageId === img.id
                    const at = img.config.agent_type
                    return (
                      <div
                        key={img.id}
                        onClick={() => handleSelectImage(img)}
                        className={cn(
                          'relative flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                          sel ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border hover:border-primary/40 hover:shadow-sm'
                        )}
                      >
                        {sel && <div className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></div>}
                        <div className="flex items-center gap-2">
                          {img.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.icon} alt="" className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <Bot className="h-8 w-8 text-primary" />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{img.name}</div>
                            {img.tag && <div className="text-[11px] text-muted-foreground font-mono truncate">{img.tag}</div>}
                          </div>
                        </div>
                        {img.description && <p className="text-xs text-muted-foreground line-clamp-2">{img.description}</p>}
                        {at && <Badge variant="outline" className="text-[11px] w-fit">{at}</Badge>}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 2. 计费模式 ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">计费模式</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {billingOptions.map(opt => {
                  const sel = billingType === opt.id
                  const Icon = opt.icon
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setBillingType(opt.id)}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                        sel ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border hover:border-primary/40 hover:shadow-sm'
                      )}
                    >
                      {sel && <div className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></div>}
                      <Icon className={cn('h-5 w-5', sel ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                  )
                })}
              </div>
              {billingType === 'monthly' && (
                <div className="mt-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">购买时长</Label>
                  <div className="flex gap-2">
                    {monthDurations.map(d => (
                      <Button
                        key={d.value}
                        variant={durationMonths === d.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDurationMonths(d.value)}
                        className="relative"
                      >
                        {d.label}
                        {d.discount && (
                          <span className="absolute -top-2 -right-2 text-[10px] bg-orange-500 text-white px-1 rounded-full">{d.discount}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 3. 实例规格 + 数据盘 ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">实例规格</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {agentSpecs.map(spec => {
                  const sel = selectedSpec.label === spec.label
                  return (
                    <div
                      key={spec.label}
                      onClick={() => setSelectedSpec(spec)}
                      className={cn(
                        'relative flex flex-col items-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                        sel ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border hover:border-primary/40 hover:shadow-sm'
                      )}
                    >
                      {sel && <div className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></div>}
                      <div className="font-bold text-sm">{spec.label}</div>
                      <div className="text-xs text-muted-foreground">{spec.cpu}C{spec.memory}G</div>
                      <div className="text-xs text-muted-foreground">{spec.desc}</div>
                      <div className="mt-1">
                        <span className="text-primary font-bold">¥{spec.hourlyPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-muted-foreground">/时</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 grid gap-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <HardDrive className="h-3.5 w-3.5 text-muted-foreground" /> 数据盘 (GB)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number" min={10} max={2000} step={10}
                    value={diskGb}
                    onChange={e => setDiskGb(Math.max(10, parseInt(e.target.value) || 50))}
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">默认 50GB，用于持久化智能体配置与会话数据</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <FolderInput className="h-3.5 w-3.5 text-muted-foreground" /> 挂载路径
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    value={dataMountPath}
                    onChange={e => setDataMountPath(e.target.value)}
                    placeholder="/opt/data"
                    className="max-w-xs font-mono"
                  />
                  <span className="text-xs text-muted-foreground">数据盘在容器内的挂载点，默认 /opt/data（智能体数据目录），可修改</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 4. 基本信息 ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">基本信息</h3>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>实例名称 *</Label>
                  <Input name="agent-instance-label" placeholder="my-agent" value={instanceName} onChange={e => setInstanceName(e.target.value)} autoComplete="off" />
                </div>
                <div className="grid gap-2">
                  <Label>节点类型</Label>
                  <Select value={nodeType} onValueChange={handleNodeTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">云端节点</SelectItem>
                      <SelectItem value="edge">边缘节点</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {nodeType === 'edge' && (
                  <div className="grid gap-2">
                    <Label>边缘节点 *</Label>
                    {edgeLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> 加载节点列表...
                      </div>
                    ) : edgeNodes.length === 0 ? (
                      <p className="text-sm text-red-500">无可用边缘节点，请检查集群配置</p>
                    ) : (
                      <Select value={nodeName} onValueChange={setNodeName}>
                        <SelectTrigger><SelectValue placeholder="选择边缘节点" /></SelectTrigger>
                        <SelectContent>
                          {edgeNodes.map(n => (
                            <SelectItem key={n.name} value={n.name}>
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${n.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                <span className="font-mono text-xs">{n.name}</span>
                                {n.ip && <span className="text-muted-foreground text-xs">({n.ip})</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── 5. 高级选项（折叠）：模型密钥 / 消息通道 / 端口 / 自定义镜像，均为可选 ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 w-full">
                <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', showAdvanced && 'rotate-90')} />
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground">高级选项</h3>
                <span className="text-xs text-muted-foreground">（模型密钥 / 消息通道 / 端口，均可选，可创建后再配置）</span>
              </button>
              {showAdvanced && (
                <div className="mt-4 grid gap-5 pl-1 border-l-2 border-muted ml-1">
                {(showModels || showChannels) && (
                <div className={cn('grid gap-5', showModels && showChannels ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>

                  {/* ── 模型 (Models) ── */}
                  {showModels && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 pb-3 border-b mb-4">
                        <Key className="h-4 w-4 text-blue-500" />
                        <h3 className="font-semibold">模型密钥 (可选)</h3>
                      </div>
                      <div className="space-y-3 flex-1">
                        <Select value={mkForm.provider} onValueChange={v => { const p = getPreset(v); setMkForm(f => ({ ...f, provider: v, base_url: p.defaultBase })) }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {providerPresets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {getPreset(mkForm.provider).models.length > 0 ? (
                          <Select value={mkForm.model_name} onValueChange={v => setMkForm(f => ({ ...f, model_name: v }))}>
                            <SelectTrigger><SelectValue placeholder="选择模型" /></SelectTrigger>
                            <SelectContent>
                              {getPreset(mkForm.provider).models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input name="ag-model-name" autoComplete="off" placeholder="模型名称" value={mkForm.model_name} onChange={e => setMkForm(f => ({ ...f, model_name: e.target.value }))} />
                        )}
                        <Input name="ag-model-apikey" autoComplete="off" placeholder={getPreset(mkForm.provider).placeholder || 'API Key'} value={mkForm.api_key} onChange={e => setMkForm(f => ({ ...f, api_key: e.target.value }))} className="font-mono" />
                        <Button className="w-full" variant="outline" onClick={handleAddModelKey}>添加模型密钥</Button>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {providerDescs[mkForm.provider] || ''}
                          {getPreset(mkForm.provider).defaultBase && (
                            <a href={getPreset(mkForm.provider).defaultBase} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                              点此查看 <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </p>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-muted-foreground font-medium mb-2">已添加 ({modelKeys.length})</p>
                        {modelKeys.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                        ) : (
                          <div className="space-y-1.5">
                            {modelKeys.map((k, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5">
                                <div className="truncate">
                                  <span className="font-medium">{getPreset(k.provider).name}</span>
                                  {k.model_name && <span className="text-muted-foreground ml-1">· {k.model_name}</span>}
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setModelKeys(prev => prev.filter((_, j) => j !== i))}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── 通道 (Channels) ── */}
                  {showChannels && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 pb-3 border-b mb-4">
                        <Radio className="h-4 w-4 text-green-500" />
                        <h3 className="font-semibold">消息通道 (可选)</h3>
                      </div>
                      <div className="space-y-3 flex-1">
                        <Select value={chType} onValueChange={handleChannelTypeChange}>
                          <SelectTrigger><SelectValue placeholder="选择通道类型" /></SelectTrigger>
                          <SelectContent>
                            {creatableChannelTypes.map(t => <SelectItem key={t} value={t}>{channelLabels[t] || t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {chType && Object.keys(channelTemplate[chType] || {}).map(field => (
                          <Input
                            key={field}
                            name={`ag-ch-${chType}-${field}`}
                            autoComplete="off"
                            placeholder={field}
                            value={chFields[field] || ''}
                            onChange={e => setChFields(f => ({ ...f, [field]: e.target.value }))}
                            className="font-mono"
                          />
                        ))}
                        <Button className="w-full" variant="outline" onClick={handleAddChannel}>添加通道</Button>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          通道凭据经环境变量注入实例，创建后自动生效。微信通道需在实例运行后通过「连接微信」扫码接入。
                        </p>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-muted-foreground font-medium mb-2">已添加 ({channels.length})</p>
                        {channels.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                        ) : (
                          <div className="space-y-1.5">
                            {channels.map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5">
                                <span className="font-medium truncate">{channelLabels[c.type] || c.type}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setChannels(prev => prev.filter((_, j) => j !== i))}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
                )}
                  <div className="grid gap-2">
                    <Label>服务端口</Label>
                    <Input type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || 8642)} />
                    <span className="text-xs text-muted-foreground">默认取自镜像声明（Hermes 为 8642）</span>
                  </div>
                  <div className="grid gap-2">
                    <Label>自定义镜像地址</Label>
                    <Input placeholder="不填则使用上方所选智能体镜像" value={customImageUrl} onChange={e => setCustomImageUrl(e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== 右侧费用摘要 ===== */}
        <div className="w-80 shrink-0 sticky top-20">
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> 费用摘要
              </h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">智能体</span>
                  <span className="text-xs truncate max-w-[150px]">{selectedImage?.name || '未选择'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">规格</span>
                  <span className="font-medium">{selectedSpec.label} {selectedSpec.cpu}C{selectedSpec.memory}G</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">数据盘</span>
                  <span>{diskGb}GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">挂载路径</span>
                  <span className="font-mono text-xs truncate max-w-[150px]" title={dataMountPath}>{dataMountPath || '/opt/data'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">计费</span>
                  <Badge variant="outline" className="text-xs">
                    {billingOptions.find(b => b.id === billingType)?.label}
                    {billingType === 'monthly' && ` ${durationMonths}个月`}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">模型密钥</span>
                  <span>{modelKeys.filter(k => k.api_key).length} 个</span>
                </div>
                {channels.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">通道</span>
                    <span>{channels.length} 个</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t">
                <div className="text-center">
                  <div>
                    <span className="text-primary text-3xl font-bold">¥{estimatedCost.price.toFixed(2)}</span>
                    <span className="text-muted-foreground text-sm">{estimatedCost.unit}</span>
                  </div>
                  {billingType === 'hourly' && (
                    <p className="text-xs text-muted-foreground mt-1">≈ ¥{monthlyPrice.toFixed(2)}/月（满月估算）</p>
                  )}
                  {estimatedCost.total && (
                    <p className="text-xs text-muted-foreground mt-1">
                      总计：<span className="text-foreground font-medium">¥{estimatedCost.total.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              </div>

              <Button className="w-full mt-5" size="lg" onClick={handleCreate} disabled={creating || !selectedImageId}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                立即创建
              </Button>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                创建后将立即开始计费{billingType !== 'hourly' && '，预付费用从余额扣除'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
