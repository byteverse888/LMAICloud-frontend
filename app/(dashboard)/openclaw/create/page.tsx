'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Bot, Check, ChevronRight, Loader2, Search,
  Key, Radio, Puzzle, Plus, Trash2, Settings2, ExternalLink,
  Cpu, HardDrive, Zap, CreditCard, Clock, Calendar,
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
import { useImages } from '@/hooks/use-api'
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
        const { data } = await api.get<{ list: { name: string; status: string; ip?: string }[] }>('/openclaw/edge-nodes')
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

// ====== 规格定义 ======
interface ClawSpec {
  cpu: number; memory: number; disk: number
  label: string; desc: string; hourlyPrice: number
}
const clawSpecs: ClawSpec[] = [
  { cpu: 1, memory: 2, disk: 10, label: '入门型', desc: '轻量测试', hourlyPrice: 0.06 },
  { cpu: 2, memory: 4, disk: 20, label: '通用型', desc: '日常使用', hourlyPrice: 0.12 },
  { cpu: 4, memory: 8, disk: 40, label: '专业型', desc: '多模型并发', hourlyPrice: 0.24 },
  { cpu: 8, memory: 16, disk: 80, label: '旗舰型', desc: '高负载生产', hourlyPrice: 0.48 },
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
  { id: 'deepseek', name: 'DeepSeek', defaultBase: 'https://api.deepseek.com/v1', placeholder: 'sk-...', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { id: 'qwen', name: '通义千问', defaultBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1', placeholder: 'sk-...', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
  { id: 'zhipu', name: '智谱 AI', defaultBase: 'https://open.bigmodel.cn/api/paas/v4', placeholder: '...', models: ['glm-4', 'glm-4-flash', 'glm-3-turbo'] },
  { id: 'other', name: '自定义', defaultBase: '', placeholder: 'API Key', models: [] },
]

// ====== 通道类型 ======
const channelTypes = [
  { id: 'qq', label: 'QQ' },
  { id: 'wechat', label: '微信' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'discord', label: 'Discord' },
  { id: 'feishu', label: '飞书' },
  { id: 'dingtalk', label: '钉钉' },
  { id: 'slack', label: 'Slack' },
]

// ====== 通道类型动态配置（参考腾讯云 OpenClaw） ======
const channelConfigs: Record<string, { nameLabel: string; configLabel: string; desc: string }> = {
  qq: { nameLabel: 'QQ机器人的App ID', configLabel: 'QQ机器人的App Secret', desc: '一键解锁智能玩法，开启你的个性化QQ机器人之旅。' },
  wechat: { nameLabel: '微信公众号AppID', configLabel: '微信公众号AppSecret', desc: '接入微信公众号，打造您的智能微信助手。' },
  telegram: { nameLabel: 'Bot Token', configLabel: 'Chat ID（可选）', desc: '连接Telegram Bot，构建全球化AI助手。' },
  discord: { nameLabel: 'Bot Token', configLabel: 'Guild ID（可选）', desc: '接入Discord服务器，打造社区AI机器人。' },
  feishu: { nameLabel: 'App ID', configLabel: 'App Secret', desc: '接入飞书，让AI融入企业协作。' },
  dingtalk: { nameLabel: 'Robot Webhook', configLabel: 'Secret', desc: '接入钉钉群机器人，赋能团队协作。' },
  slack: { nameLabel: 'Bot Token', configLabel: 'Signing Secret', desc: '连接Slack工作区，提升团队效率。' },
}
const getChannelConfig = (type: string) => channelConfigs[type] || { nameLabel: 'App ID', configLabel: 'App Secret', desc: '' }

// ====== Provider 描述 ======
const providerDescs: Record<string, string> = {
  openai: 'OpenAI GPT系列模型，全球领先的AI大模型服务。模型API及后付费设置，',
  deepseek: 'DeepSeek模型服务，提供高性价比的AI推理能力。模型API及后付费设置，',
  qwen: '通义千问，阿里云大模型服务，集成多种AI能力。模型API及后付费设置，',
  zhipu: '智谱AI GLM系列模型，国产大模型领先者。模型API及后付费设置，',
  other: '自定义模型服务，支持OpenAI兼容API的任意模型提供商。',
}

// ====== ModelKey 表单项 ======
interface ModelKeyItem {
  provider: string; alias: string; api_key: string; base_url: string; model_name: string
}
const emptyKey = (): ModelKeyItem => ({ provider: 'openai', alias: '', api_key: '', base_url: '', model_name: '' })

// ====== Channel 表单项 ======
interface ChannelItem { type: string; name: string; config: string }
const emptyChannel = (): ChannelItem => ({ type: 'qq', name: '', config: '' })

// ====== Skill 表单项 ======
interface SkillItem { name: string; description: string; version: string }
const emptySkill = (): SkillItem => ({ name: '', description: '', version: '' })

export default function OpenClawCreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetImageId = searchParams.get('imageId') || ''
  const { images } = useImages()
  const openclawImages = useMemo(() => images.filter((img: any) => img.category === 'openclaw'), [images])

  // 镜像只有一个时自动选中，或通过 URL 参数自动选中
  useEffect(() => {
    if (presetImageId) {
      const match = openclawImages.find((img: any) => img.id === presetImageId)
      if (match && !selectedImage) {
        setSelectedImage(presetImageId)
      }
    } else if (openclawImages.length === 1 && !selectedImage) {
      setSelectedImage(openclawImages[0].id)
    }
  }, [openclawImages, presetImageId])

  // ── 表单状态 ──
  const [billingType, setBillingType] = useState('hourly')
  const [durationMonths, setDurationMonths] = useState(1)
  const [selectedSpec, setSelectedSpec] = useState<ClawSpec>(clawSpecs[1])
  const [selectedImage, setSelectedImage] = useState('')
  const [instanceName, setInstanceName] = useState('')
  const [nodeType, setNodeType] = useState('center')
  const [nodeName, setNodeName] = useState('')
  const [port, setPort] = useState(18789)
  const [customImageUrl, setCustomImageUrl] = useState('')

  // 边缘节点列表
  const { nodes: edgeNodes, loading: edgeLoading } = useEdgeNodes()

  // 切换节点类型时重置 node_name
  const handleNodeTypeChange = (v: string) => {
    setNodeType(v)
    if (v === 'center') setNodeName('')
  }

  // 模型/通道/技能 — 表单 + 已添加列表
  const [modelKeys, setModelKeys] = useState<ModelKeyItem[]>([])
  const [mkForm, setMkForm] = useState<ModelKeyItem>(emptyKey())
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [chForm, setChForm] = useState<ChannelItem>(emptyChannel())
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [skForm, setSkForm] = useState<SkillItem>(emptySkill())

  // 高级选项
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [creating, setCreating] = useState(false)

  // ── 价格计算 ──
  const hourlyPrice = selectedSpec.hourlyPrice
  const monthlyPrice = hourlyPrice * 24 * 30
  const yearlyPrice = hourlyPrice * 24 * 365

  const estimatedCost = useMemo(() => {
    if (billingType === 'hourly') return { price: hourlyPrice, unit: '/时', total: null }
    if (billingType === 'monthly') {
      const discount = durationMonths >= 12 ? 0.85 : durationMonths >= 6 ? 0.9 : durationMonths >= 3 ? 0.95 : 1
      const total = monthlyPrice * durationMonths * discount
      return { price: monthlyPrice * discount, unit: '/月', total }
    }
    // yearly
    const total = yearlyPrice * 0.8
    return { price: yearlyPrice * 0.8, unit: '/年', total }
  }, [billingType, hourlyPrice, durationMonths, monthlyPrice, yearlyPrice])

  // ── Provider helper ──
  const getPreset = (id: string) => providerPresets.find(p => p.id === id) || providerPresets[4]

  // ── 三列表单添加操作 ──
  const handleAddModelKey = () => {
    if (!mkForm.api_key.trim()) { toast.error('请输入 API Key'); return }
    setModelKeys(prev => [...prev, { ...mkForm }])
    setMkForm(emptyKey())
    toast.success('模型已添加')
  }
  const handleAddChannel = () => {
    if (!chForm.type) return
    setChannels(prev => [...prev, { ...chForm }])
    setChForm(emptyChannel())
    toast.success('通道已添加')
  }
  const handleAddSkill = () => {
    if (!skForm.name.trim()) { toast.error('请输入技能名称'); return }
    setSkills(prev => [...prev, { ...skForm }])
    setSkForm(emptySkill())
    toast.success('技能已添加')
  }

  // ── 提交 ──
  const handleCreate = async () => {
    if (!instanceName.trim()) { toast.error('请输入实例名称'); return }
    const validKeys = modelKeys.filter(k => k.api_key.trim())

    try {
      setCreating(true)
      const body: any = {
        name: instanceName.trim(),
        node_type: nodeType,
        cpu_cores: selectedSpec.cpu,
        memory_gb: selectedSpec.memory,
        disk_gb: selectedSpec.disk,
        port,
        billing_type: billingType,
      }
      if (nodeType === 'edge') {
        if (!nodeName) { toast.error('请选择边缘节点'); setCreating(false); return }
        body.node_name = nodeName
      }
      if (billingType === 'monthly') body.duration_months = durationMonths
      if (selectedImage) {
        const img = openclawImages.find((i: any) => i.id === selectedImage)
        if (img) body.image_url = (img as any).url || (img as any).image_url
      } else if (customImageUrl) {
        body.image_url = customImageUrl
      }
      if (validKeys.length > 0) {
        body.model_keys = validKeys.map(k => ({
          provider: k.provider,
          alias: k.alias || undefined,
          api_key: k.api_key,
          base_url: k.base_url || undefined,
          model_name: k.model_name || undefined,
        }))
      }
      const validChannels = channels.filter(c => c.type)
      if (validChannels.length > 0) {
        body.channels = validChannels.map(c => ({
          type: c.type,
          name: c.name || undefined,
          config: c.config || undefined,
        }))
      }
      const validSkills = skills.filter(s => s.name.trim())
      if (validSkills.length > 0) {
        body.skills = validSkills.map(s => ({
          name: s.name,
          description: s.description || undefined,
          version: s.version || undefined,
        }))
      }

      await api.post('/openclaw/instances', body)
      toast.success('实例创建中')
      router.push('/openclaw')
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/openclaw')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> 创建智能体实例
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">配置您的 OpenClaw AI Agent 实例</p>
        </div>
      </div>

      {/* 主体：左配置 + 右费用 */}
      <div className="flex gap-6 items-start">
        {/* ===== 左侧配置区 ===== */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── 1. 计费模式 ── */}
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

          {/* ── 2. 实例规格 ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">实例规格</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {clawSpecs.map(spec => {
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
                      <div className="text-xs text-muted-foreground">{spec.cpu}C{spec.memory}G / {spec.disk}GB</div>
                      <div className="text-xs text-muted-foreground">{spec.desc}</div>
                      <div className="mt-1">
                        <span className="text-primary font-bold">¥{spec.hourlyPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-muted-foreground">/时</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── 3. OpenClaw 版本 ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">OpenClaw 版本</h3>
              </div>
              {openclawImages.length > 0 ? (
                <Select value={selectedImage} onValueChange={setSelectedImage}>
                  <SelectTrigger><SelectValue placeholder="选择 OpenClaw 版本镜像" /></SelectTrigger>
                  <SelectContent>
                    {openclawImages.map((img: any) => (
                      <SelectItem key={img.id} value={img.id}>
                        {img.name} {img.version ? `(${img.version})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">暂无 OpenClaw 镜像，将使用默认版本</p>
              )}
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
                  <Input name="openclaw-instance-label" placeholder="my-agent" value={instanceName} onChange={e => setInstanceName(e.target.value)} autoComplete="openclaw-nope" />
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

          {/* ── 5. 模型 & 通道 & 技能 三列布局（参考腾讯云 OpenClaw） ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── 模型 (Models) ── */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Key className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold">模型 (Models)</h3>
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
                      <Input name="oc-model-name" autoComplete="oc-nope" placeholder="模型名称" value={mkForm.model_name} onChange={e => setMkForm(f => ({ ...f, model_name: e.target.value }))} />
                    )}
                    <Input name="oc-model-apikey" autoComplete="oc-nope" placeholder={getPreset(mkForm.provider).placeholder || 'API Key'} value={mkForm.api_key} onChange={e => setMkForm(f => ({ ...f, api_key: e.target.value }))} className="font-mono" />
                    <Button className="w-full" variant="outline" onClick={handleAddModelKey}>
                      一键添加并应用
                    </Button>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {providerDescs[mkForm.provider] || ''}
                      {getPreset(mkForm.provider).defaultBase && (
                        <a href={getPreset(mkForm.provider).defaultBase} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                          点此查看 <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  </div>
                  {/* 切换模型 */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">切换模型</p>
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

                {/* ── 通道 (Channels) ── */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <Radio className="h-4 w-4 text-green-500" />
                    <h3 className="font-semibold">通道 (Channels)</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <Select value={chForm.type} onValueChange={v => setChForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {channelTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input name="oc-channel-name" autoComplete="oc-nope" placeholder={getChannelConfig(chForm.type).nameLabel} value={chForm.name} onChange={e => setChForm(f => ({ ...f, name: e.target.value }))} />
                    <Input name="oc-channel-secret" autoComplete="oc-nope" placeholder={getChannelConfig(chForm.type).configLabel} value={chForm.config} onChange={e => setChForm(f => ({ ...f, config: e.target.value }))} className="font-mono" />
                    <Button className="w-full" variant="outline" onClick={handleAddChannel}>
                      添加并应用
                    </Button>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {getChannelConfig(chForm.type).desc}
                      <a href="#" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">查看详情 <ExternalLink className="h-3 w-3" /></a>
                    </p>
                  </div>
                  {/* 已接入通道 */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">已接入通道</p>
                    {channels.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {channels.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5">
                            <div className="truncate">
                              <span className="font-medium">{channelTypes.find(ct => ct.id === c.type)?.label || c.type}</span>
                              {c.name && <span className="text-muted-foreground ml-1">· {c.name}</span>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setChannels(prev => prev.filter((_, j) => j !== i))}>
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
                      <Input className="pl-8" placeholder="请输入ClawHub中上架的Skill名称，或输入后回车搜索" value={skForm.name} onChange={e => setSkForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleAddSkill() }} />
                    </div>
                    <Button className="w-full" variant="outline" onClick={handleAddSkill}>
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
                    {skills.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">暂无数据</div>
                    ) : (
                      <div className="space-y-1.5">
                        {skills.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-2.5 py-1.5">
                            <span className="font-medium truncate">{s.name}{s.version && ` ${s.version}`}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 shrink-0" onClick={() => setSkills(prev => prev.filter((_, j) => j !== i))}>
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

          {/* ── 8. 高级选项（折叠） ── */}
          <Card className="card-clean overflow-hidden">
            <CardContent className="p-5">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 w-full"
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', showAdvanced && 'rotate-90')} />
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground">高级选项</h3>
              </button>
              {showAdvanced && (
                <div className="mt-4 grid gap-4 pl-1 border-l-2 border-muted ml-1">
                  <div className="grid gap-2">
                    <Label>端口</Label>
                    <Input type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || 18789)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>自定义镜像地址</Label>
                    <Input placeholder="不填则使用上方版本选择" value={customImageUrl} onChange={e => setCustomImageUrl(e.target.value)} />
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

              {/* 配置摘要 */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">规格</span>
                  <span className="font-medium">{selectedSpec.label} {selectedSpec.cpu}C{selectedSpec.memory}G</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">磁盘</span>
                  <span>{selectedSpec.disk}GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">计费</span>
                  <Badge variant="outline" className="text-xs">
                    {billingOptions.find(b => b.id === billingType)?.label}
                    {billingType === 'monthly' && ` ${durationMonths}个月`}
                  </Badge>
                </div>
                {selectedImage && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">版本</span>
                    <span className="text-xs truncate max-w-[140px]">
                      {openclawImages.find((i: any) => i.id === selectedImage)?.name || '自定义'}
                    </span>
                  </div>
                )}
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
                {skills.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">技能</span>
                    <span>{skills.length} 个</span>
                  </div>
                )}
              </div>

              {/* 价格 */}
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

              {/* 创建按钮 */}
              <Button
                className="w-full mt-5"
                size="lg"
                onClick={handleCreate}
                disabled={creating}
              >
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
