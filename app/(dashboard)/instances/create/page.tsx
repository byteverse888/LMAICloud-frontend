'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Minus, Loader2, X, Server, Cpu, HardDrive,
  Terminal, Clock, Zap, Image as ImageIcon,
  ChevronRight, Check, AlertCircle, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'react-hot-toast'
import { useImages } from '@/hooks/use-api'
import api from '@/lib/api'

// ============ 资源配置 hook ============
interface ResourceConfig {
  node_id: string; node_name: string; node_type: string; resource_type: string
  gpu_model: string; gpu_memory: number; cpu_model: string; cpu_cores: number
  memory: number; disk: number; network_desc: string
  gpu_available: number; gpu_total: number; hourly_price: number
}

function useResourceConfigs(filters?: { resource_type?: string }) {
  const [configs, setConfigs] = useState<ResourceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (filters?.resource_type) params.resource_type = filters.resource_type
      const { data } = await api.get<{ list: ResourceConfig[]; total: number }>('/instances/resource-configs', params)
      setConfigs(data.list || [])
    } catch {
      setConfigs([
        { node_id: 'n1', node_name: 'gpu-01', node_type: 'center', resource_type: 'no_gpu', gpu_model: 'intel', gpu_memory: 0, cpu_model: 'intel 1核 2G', cpu_cores: 1, memory: 2, disk: 30, network_desc: '--', gpu_available: 100, gpu_total: 0, hourly_price: 0.1 },
        { node_id: 'n2', node_name: 'gpu-02', node_type: 'center', resource_type: 'vGPU', gpu_model: 'NVIDIA-A100-SXM4-80GB', gpu_memory: 20, cpu_model: 'intel 3核 25G', cpu_cores: 3, memory: 25, disk: 50, network_desc: '--', gpu_available: 28, gpu_total: 32, hourly_price: 1.75 },
        { node_id: 'n3', node_name: 'gpu-03', node_type: 'center', resource_type: 'vGPU', gpu_model: 'NVIDIA-A100-SXM4-80GB', gpu_memory: 40, cpu_model: 'intel 6核 50G', cpu_cores: 6, memory: 50, disk: 50, network_desc: '--', gpu_available: 13, gpu_total: 16, hourly_price: 3.5 },
        { node_id: 'n4', node_name: 'edge-01', node_type: 'edge', resource_type: 'no_gpu', gpu_model: 'AMD', gpu_memory: 0, cpu_model: 'AMD 1核 2G', cpu_cores: 1, memory: 2, disk: 30, network_desc: '--', gpu_available: 0, gpu_total: 0, hourly_price: 0.1 },
      ])
    } finally { setLoading(false) }
  }, [filters?.resource_type])
  useEffect(() => { fetchConfigs() }, [fetchConfigs])
  return { configs, loading }
}

const sourceOptions = [
  { value: 'default', label: '默认' },
  { value: 'aliyun', label: 'aliyun' },
  { value: 'tsinghua', label: '清华' },
  { value: 'ustc', label: '中科大' },
]

const imageCategories = [
  { value: 'base', label: '基础镜像' },
  { value: 'app', label: '应用镜像' },
  { value: 'framework', label: 'AI框架' },
  { value: 'openclaw', label: '智能体' },
]

// ============ 容器实例规格 =============
interface SpecOption { cpu: number; memory: number; label: string; price: number }
const containerSpecs: Record<string, { label: string; desc: string; specs: SpecOption[] }> = {
  general: {
    label: '通用型', desc: 'CPU:内存 = 1:2，适合大多数应用场景',
    specs: [
      { cpu: 2, memory: 4, label: '2核4G', price: 0.12 },
      { cpu: 4, memory: 8, label: '4核8G', price: 0.24 },
      { cpu: 8, memory: 16, label: '8核16G', price: 0.48 },
    ],
  },
  compute: {
    label: '计算型', desc: 'CPU:内存 = 1:1，适合计算密集型任务',
    specs: [
      { cpu: 2, memory: 2, label: '2核2G', price: 0.08 },
      { cpu: 4, memory: 4, label: '4核4G', price: 0.16 },
      { cpu: 8, memory: 8, label: '8核8G', price: 0.32 },
      { cpu: 16, memory: 16, label: '16核16G', price: 0.64 },
    ],
  },
  memory: {
    label: '内存型', desc: 'CPU:内存 = 1:4，适合内存密集型任务',
    specs: [
      { cpu: 1, memory: 4, label: '1核4G', price: 0.10 },
      { cpu: 2, memory: 8, label: '2核8G', price: 0.20 },
      { cpu: 4, memory: 16, label: '4核16G', price: 0.40 },
    ],
  },
}

// ============ 分区标题 ============
function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

// ============ 表单行 ============
function FormRow({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-[110px_1fr] gap-4 items-start ${className || ''}`}>
      <Label className="text-right text-sm text-muted-foreground pt-2.5 select-none">
        {required && <span className="text-red-400 mr-0.5">*</span>}{label}
      </Label>
      <div>{children}</div>
    </div>
  )
}

export default function InstanceCreatePage() {
  const router = useRouter()

  const [instanceName, setInstanceName] = useState('')
  const [resourceTab, setResourceTab] = useState('new')
  const [billingMode, setBillingMode] = useState('hourly')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all')
  const [nodeTypeFilter, setNodeTypeFilter] = useState('all')
  const [selectedConfig, setSelectedConfig] = useState<ResourceConfig | null>(null)
  const [instanceCount, setInstanceCount] = useState(1)
  const [storageMounts, setStorageMounts] = useState<{ name: string; mount_path: string; size_gb: number }[]>([])
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([])
  const [imageCategory, setImageCategory] = useState('app')
  const [selectedImage, setSelectedImage] = useState('')
  const [selectedImageTag, setSelectedImageTag] = useState('')
  const [externalImageUrl, setExternalImageUrl] = useState('')
  const [pipSource, setPipSource] = useState('aliyun')
  const [condaSource, setCondaSource] = useState('aliyun')
  const [aptSource, setAptSource] = useState('aliyun')
  const [startupCommand, setStartupCommand] = useState('')
  const [autoShutdown, setAutoShutdown] = useState('none')
  const [autoRelease, setAutoRelease] = useState('none')
  const [shutdownMinutes, setShutdownMinutes] = useState(60)
  const [releaseMinutes, setReleaseMinutes] = useState(60)
  const [creating, setCreating] = useState(false)
  const [specType, setSpecType] = useState('general')
  const [selectedSpec, setSelectedSpec] = useState<SpecOption>(containerSpecs.general.specs[0])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { configs, loading: configsLoading } = useResourceConfigs(
    resourceTypeFilter !== 'all' ? { resource_type: resourceTypeFilter } : undefined
  )
  const { images } = useImages()

  // 从镜像市场跳转时预选镜像
  const searchParams = useSearchParams()
  const presetImageId = searchParams.get('imageId')
  useEffect(() => {
    if (presetImageId && images.length > 0) {
      const img = images.find((i: any) => i.id === presetImageId)
      if (img) {
        setImageCategory(img.category || img.type || 'app')
        setSelectedImage(img.name)
        setSelectedImageTag(img.tag)
      }
    }
  }, [presetImageId, images])

  const gpuModels = [...new Set(configs.map(c => c.gpu_model))]
  // 按 GPU 型号+显存分类（同型号同显存归为一类）
  const gpuCategories = [...new Map(
    configs
      .filter(c => c.resource_type === 'vGPU' && c.gpu_model && c.gpu_model !== 'N/A')
      .map(c => {
        const key = `${c.gpu_model}|${c.gpu_memory || 0}`
        const label = c.gpu_memory && c.gpu_memory > 0
          ? `${c.gpu_model.replace(/NVIDIA-/i, '').replace(/-/g, ' ')} ${c.gpu_memory}G`
          : c.gpu_model.replace(/NVIDIA-/i, '').replace(/-/g, ' ')
        return [key, { value: c.gpu_model, label, memory: c.gpu_memory || 0 }] as const
      })
  ).values()]
  const hasEdgeNodes = configs.some(c => c.node_type === 'edge')
  const filteredConfigs = configs.filter(c => {
    // 节点类型过滤
    if (nodeTypeFilter === 'center' && c.node_type !== 'center') return false
    if (nodeTypeFilter === 'edge' && c.node_type !== 'edge') return false
    // 资源类型过滤
    if (resourceTypeFilter === 'all') return true
    if (resourceTypeFilter === 'vGPU') return c.resource_type === 'vGPU'
    if (resourceTypeFilter === 'no_gpu') return c.resource_type === 'no_gpu'
    return c.gpu_model === resourceTypeFilter
  })

  const gpuHourly = selectedConfig ? selectedConfig.hourly_price : 0
  const totalHourly = (selectedSpec.price + gpuHourly) * instanceCount

  const handleCreate = async () => {
    if (!instanceName.trim()) { toast.error('请输入实例名称'); return }
    if (!selectedConfig) { toast.error('请选择资源配置'); return }
    if (!selectedImage) { toast.error('请选择镜像'); return }
    setCreating(true)
    try {
      const payload: any = {
        name: instanceName, node_id: selectedConfig.node_id,
        gpu_count: selectedConfig.resource_type === 'vGPU' ? 1 : 0,
        gpu_model: selectedConfig.gpu_model, billing_type: billingMode,
        resource_type: selectedConfig.resource_type, node_type: selectedConfig.node_type,
        cpu_cores: selectedSpec.cpu, memory_gb: selectedSpec.memory,
        spec_type: specType, spec_label: selectedSpec.label,
        instance_count: instanceCount, pip_source: pipSource, conda_source: condaSource, apt_source: aptSource,
        startup_command: startupCommand.trim() || undefined,
        auto_shutdown_type: autoShutdown,
        auto_shutdown_minutes: autoShutdown === 'timer' ? shutdownMinutes : undefined,
        auto_release_type: autoRelease,
        auto_release_minutes: autoRelease === 'timer' ? releaseMinutes : undefined,
      }
      if (imageCategory === 'external') {
        payload.image_url = externalImageUrl
      } else if (selectedImage) {
        // 通过 name + tag 匹配到具体镜像记录
        const img = images.find(i => i.name === selectedImage && i.tag === selectedImageTag)
        if (img) {
          payload.image_id = img.id
          payload.image_url = img.image_url || `${img.name}:${img.tag}`
        }
      }
      if (envVars.length > 0) payload.env_vars = envVars.filter(e => e.key)
      if (storageMounts.length > 0) payload.storage_mounts = storageMounts.filter(s => s.name)
      await api.post<{ id: string }>('/instances', payload)
      toast.success('实例创建中，请稍候...')
      router.push('/instances')
    } catch (error: any) { toast.error(error?.message || '创建失败') }
    finally { setCreating(false) }
  }

  const isSelected = (cfg: ResourceConfig) =>
    selectedConfig?.node_id === cfg.node_id && selectedConfig?.resource_type === cfg.resource_type

  // ============ 切换按钮组 ============
  const ToggleGroup = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 text-sm rounded-md font-medium transition-all duration-200 ${
            value === o.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >{o.label}</button>
      ))}
    </div>
  )

  return (
    <div className="animate-fade-in pb-24">
      {/* ===== 页头 ===== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push('/instances')}>容器实例</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">创建实例</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">创建容器实例</h1>
        <p className="text-sm text-muted-foreground mt-1">配置您的 GPU 容器实例，选择资源规格和镜像后即可一键创建。</p>
      </div>

      <div className="space-y-6 max-w-5xl">
        {/* ===== 基础信息 ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={Server} title="基础信息" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow label="实例名称" required>
              <Input
                name="container-instance-label"
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                placeholder="请输入实例名称"
                className="max-w-sm"
                autoComplete="instance-nope"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                由中文、英文字母、数字、下划线（_）、中划线（-）组成，长度 1-50 位。
              </p>
            </FormRow>
            <FormRow label="实例数量" required>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setInstanceCount(Math.max(1, instanceCount - 1))}><Minus className="h-4 w-4" /></Button>
                <Input className="w-20 h-9 text-center font-medium" type="number" min={1} max={5} value={instanceCount} onChange={e => setInstanceCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))} />
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setInstanceCount(Math.min(5, instanceCount + 1))}><Plus className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">单次创建最多 5 个实例</p>
            </FormRow>
          </CardContent>
        </Card>

        {/* ===== 规格选择 ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.08s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={Cpu} title="规格选择" desc="选择容器实例的 CPU 和内存配置" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1 mb-1">
              {Object.entries(containerSpecs).map(([key, group]) => (
                <button
                  key={key}
                  onClick={() => { setSpecType(key); setSelectedSpec(group.specs[0]) }}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                    specType === key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >{group.label}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{containerSpecs[specType].desc}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {containerSpecs[specType].specs.map(spec => {
                const sel = selectedSpec.cpu === spec.cpu && selectedSpec.memory === spec.memory
                return (
                  <div
                    key={spec.label}
                    onClick={() => setSelectedSpec(spec)}
                    className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      sel
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                        : 'border-border hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    {sel && <div className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></div>}
                    <div className="text-lg font-bold text-foreground">{spec.label}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>CPU {spec.cpu}核</span>
                      <span className="text-border">|</span>
                      <span>内存 {spec.memory}GB</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-primary font-bold text-sm">¥{spec.price.toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">/时</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ===== 资源配置 ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={Cpu} title="资源配置" desc="选择计算资源规格" />
          </CardHeader>
          <CardContent className="space-y-5">
            <FormRow label="资源来源">
              <ToggleGroup value={resourceTab} onChange={setResourceTab} options={[{ value: 'new', label: '新购' }, { value: 'group', label: '我的资源组' }]} />
            </FormRow>
            <FormRow label="计费模式">
              <div className="space-y-1.5">
                <ToggleGroup value={billingMode} onChange={setBillingMode} options={[{ value: 'hourly', label: '按需计费' }, { value: 'monthly', label: '包年包月' }]} />
                <p className="text-xs text-muted-foreground">
                  {billingMode === 'hourly' ? '按秒计费，用完即停，灵活弹性。' : '按月/年预留资源，享受更优惠价格。'}
                  <a href="#" className="text-primary ml-1 hover:underline">计费说明</a>
                </p>
              </div>
            </FormRow>

            <Separator />

            <FormRow label="节点类型" required>
              <ToggleGroup
                value={nodeTypeFilter}
                onChange={setNodeTypeFilter}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'center', label: '中心节点' },
                  ...(hasEdgeNodes ? [{ value: 'edge', label: '边缘节点' }] : []),
                ]}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {nodeTypeFilter === 'edge' ? '边缘节点部署在靠近数据源的位置，低延迟、本地推理。' : nodeTypeFilter === 'center' ? '中心节点提供高性能 GPU 算力，适合大规模训练。' : '显示所有可用节点。'}
              </p>
            </FormRow>

            <FormRow label="资源类型" required>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'vGPU', label: 'vGPU' },
                  { value: 'no_gpu', label: '无卡启动' },
                  ...gpuCategories.map(g => ({ value: g.value, label: g.label })),
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setResourceTypeFilter(opt.value)}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium border transition-all duration-200 ${
                      resourceTypeFilter === opt.value
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            </FormRow>

            {/* 资源表格 */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="font-semibold">节点 / 类型</TableHead>
                    <TableHead className="font-semibold">计算资源</TableHead>
                    <TableHead className="font-semibold">GPU</TableHead>
                    <TableHead className="font-semibold">磁盘配置</TableHead>
                    <TableHead className="font-semibold">网络描述</TableHead>
                    <TableHead className="font-semibold text-center">可用</TableHead>
                    <TableHead className="font-semibold text-right">参考价格</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configsLoading ? (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredConfigs.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">暂无可用资源</TableCell></TableRow>
                  ) : (
                    filteredConfigs.map((cfg, idx) => {
                      const sel = isSelected(cfg)
                      const disabled = cfg.gpu_available <= 0
                      return (
                        <TableRow
                          key={`${cfg.node_id}-${cfg.resource_type}-${idx}`}
                          className={`cursor-pointer transition-all duration-200 ${
                            sel ? 'bg-primary/8 border-l-[3px] border-l-primary shadow-sm' : ''
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'}`}
                          onClick={() => !disabled && setSelectedConfig(cfg)}
                        >
                          <TableCell className="text-center">
                            <div className={`h-4.5 w-4.5 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                              sel ? 'border-primary bg-primary shadow-md shadow-primary/30' : 'border-muted-foreground/30'
                            }`}>
                              {sel && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-mono text-foreground">{cfg.node_name}</span>
                              <div className="flex items-center gap-1.5">
                                <Badge variant={cfg.resource_type === 'vGPU' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                  {cfg.resource_type === 'vGPU' ? 'vGPU' : '无卡'}
                                </Badge>
                                {cfg.node_type === 'edge' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-500">边缘</Badge>}
                              </div>
                            </div>
                            {disabled && <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" />资源不足</p>}
                          </TableCell>
                          <TableCell className="text-sm">{cfg.cpu_model}</TableCell>
                          <TableCell className="text-sm">
                            {cfg.resource_type === 'vGPU'
                              ? <span className="text-primary font-medium">{cfg.gpu_model?.replace(/NVIDIA-/i, '').replace(/-/g, ' ')} {cfg.gpu_memory ? `${cfg.gpu_memory}G` : ''}&times;1</span>
                              : <span className="text-muted-foreground">--</span>}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>系统盘 {cfg.disk}GB</div>
                            <div className="text-xs text-muted-foreground">数据盘 --</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cfg.network_desc}</TableCell>
                          <TableCell className="text-center">
                            <span className={cfg.gpu_available > 10 ? 'text-emerald-500 font-medium' : cfg.gpu_available > 0 ? 'text-amber-500 font-medium' : 'text-red-400'}>
                              {cfg.gpu_available}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-primary font-bold">¥{cfg.hourly_price}</span>
                            <span className="text-xs text-muted-foreground">/时</span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ===== 镜像配置 ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={ImageIcon} title="镜像配置" desc="选择运行环境的基础镜像" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow label="镜像" required>
              <Tabs value={imageCategory} onValueChange={setImageCategory}>
                <TabsList className="bg-muted/50">
                  {imageCategories.map(c => (
                    <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
                  ))}
                </TabsList>
                {['base', 'app', 'framework', 'custom', 'shared'].map(cat => {
                  const catImages = images.filter(i => ['base', 'app', 'framework'].includes(cat) ? i.type === cat : true)
                  const uniqueNames = [...new Map(catImages.map(i => [i.name, i])).values()]
                  const tagOptions = catImages.filter(i => i.name === selectedImage)
                  return (
                    <TabsContent key={cat} value={cat}>
                      <div className="flex gap-3 items-center mt-2">
                        <Select value={selectedImage} onValueChange={v => { setSelectedImage(v); const first = catImages.find(i => i.name === v); if (first) setSelectedImageTag(first.tag) }}>
                          <SelectTrigger className="w-44"><SelectValue placeholder="选择镜像" /></SelectTrigger>
                          <SelectContent>
                            {uniqueNames.map(img => (
                              <SelectItem key={img.name} value={img.name}>{img.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedImageTag} onValueChange={setSelectedImageTag}>
                          <SelectTrigger className="w-80"><SelectValue placeholder="选择版本" /></SelectTrigger>
                          <SelectContent>
                            {tagOptions.map(img => (
                              <SelectItem key={img.id} value={img.tag}>{img.image_url || `${img.name}:${img.tag}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  )
                })}
                <TabsContent value="external">
                  <Input className="mt-2 max-w-xl" placeholder="请输入外部镜像地址，如 docker.io/pytorch/pytorch:latest" value={externalImageUrl} onChange={e => setExternalImageUrl(e.target.value)} />
                </TabsContent>
              </Tabs>
            </FormRow>
          </CardContent>
        </Card>

        {/* ===== 高级选项 ===== */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} />
            <span className="font-medium">高级选项</span>
            <span className="text-xs">(安装源、启动命令、存储挂载、环境变量)</span>
          </button>
        </div>
        {showAdvanced && <>
        {/* 安装源 & 启动命令 */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-4">
            <SectionHeader icon={Terminal} title="运行配置" desc="安装源和启动命令" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow label="安装源">
              <div className="flex gap-5 items-center flex-wrap">
                {[
                  { label: 'pip 源', value: pipSource, onChange: setPipSource },
                  { label: 'conda 源', value: condaSource, onChange: setCondaSource },
                  { label: 'apt 源', value: aptSource, onChange: setAptSource },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{s.label}</span>
                    <Select value={s.value} onValueChange={s.onChange}>
                      <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{sourceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </FormRow>
            <FormRow label="启动命令">
              <div className="flex items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <Terminal className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" value={startupCommand} onChange={e => setStartupCommand(e.target.value)} placeholder="例如: python train.py --epochs 10" />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{startupCommand.length || 0} 字符</span>
              </div>
            </FormRow>
          </CardContent>
        </Card>
        {/* ===== 存储与环境 ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={HardDrive} title="存储与环境" desc="挂载数据卷和配置环境变量" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow label="存储与数据">
              <div className="space-y-2">
                {storageMounts.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center p-2 rounded-lg bg-muted/30 border border-dashed">
                    <Input className="w-28 h-8 text-sm bg-background" placeholder="名称" value={s.name} onChange={e => { const arr = [...storageMounts]; arr[i].name = e.target.value; setStorageMounts(arr) }} />
                    <Input className="w-44 h-8 text-sm bg-background font-mono" placeholder="挂载路径" value={s.mount_path} onChange={e => { const arr = [...storageMounts]; arr[i].mount_path = e.target.value; setStorageMounts(arr) }} />
                    <Input className="w-20 h-8 text-sm bg-background text-center" type="number" placeholder="GB" value={s.size_gb} onChange={e => { const arr = [...storageMounts]; arr[i].size_gb = parseInt(e.target.value) || 0; setStorageMounts(arr) }} />
                    <span className="text-xs text-muted-foreground">GB</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => setStorageMounts(storageMounts.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs border-dashed" onClick={() => setStorageMounts([...storageMounts, { name: '', mount_path: '/mnt/data', size_gb: 50 }])}>
                  <Plus className="h-3 w-3 mr-1" />添加存储挂载
                </Button>
              </div>
            </FormRow>

            <Separator />

            <FormRow label="环境变量">
              <div className="space-y-2">
                {envVars.map((ev, i) => (
                  <div key={i} className="flex gap-2 items-center p-2 rounded-lg bg-muted/30 border border-dashed">
                    <Input className="w-36 h-8 text-sm bg-background font-mono" placeholder="KEY" value={ev.key} onChange={e => { const arr = [...envVars]; arr[i].key = e.target.value; setEnvVars(arr) }} />
                    <span className="text-muted-foreground">=</span>
                    <Input className="flex-1 h-8 text-sm bg-background font-mono" placeholder="VALUE" value={ev.value} onChange={e => { const arr = [...envVars]; arr[i].value = e.target.value; setEnvVars(arr) }} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs border-dashed" onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}>
                  <Plus className="h-3 w-3 mr-1" />添加环境变量
                </Button>
                <p className="text-xs text-muted-foreground">系统会向容器计算环境注入相应的环境变量。</p>
              </div>
            </FormRow>
          </CardContent>
        </Card>

        {/* ===== 自动策略（暂未实现，隐藏） ===== */}
        </>}
      </div>

      {/* ===== 底部操作栏 ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/90 backdrop-blur-xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)]">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">配置费用</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold text-primary tracking-tight">¥{totalHourly.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">/小时</span>
            </div>
            {selectedSpec && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80">
                {containerSpecs[specType].label} · {selectedSpec.label}
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()} className="px-6">取消</Button>
            <Button onClick={handleCreate} disabled={creating || !selectedConfig} className="px-8 shadow-lg shadow-primary/25">
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />创建中...</> : <><Zap className="h-4 w-4 mr-1.5" />立即创建</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
