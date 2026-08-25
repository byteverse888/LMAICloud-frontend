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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'
import { useImages } from '@/hooks/use-api'
import { useAuthStore } from '@/stores/auth-store'
import api from '@/lib/api'

// ============ 环境变量校验 ============
// 与后端 schemas.EnvVarItem 的规则保持一致（后端才是真正的防线，
// 这里只是提前告知，避免用户填完一整页才在提交时报错）
const RESERVED_ENV_PREFIXES = ['NVIDIA_']
const RESERVED_ENV_KEYS = ['INSTANCE_ID', 'HOST_IP', 'PIP_SOURCE', 'CONDA_SOURCE', 'APT_SOURCE']

function validateEnvKey(rawKey: string): string | null {
  const key = rawKey.trim()
  if (!key) return null  // 空行提交时会被过滤，不报错
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return '只允许字母、数字和下划线，且不能以数字开头'
  }
  const upper = key.toUpperCase()
  if (RESERVED_ENV_KEYS.includes(upper)) return '该变量由平台注入，不可自定义'
  if (RESERVED_ENV_PREFIXES.some(p => upper.startsWith(p))) {
    return 'NVIDIA_ 开头的变量由平台管理：GPU 设备可见性按实例规格分配'
  }
  return null
}

// ============ GPU 型号目录 hook（按标签调度，不暴露节点信息） ============
interface GpuModelOption {
  gpu_model: string
  gpu_memory_gb: number | null
  gpu_total: number
  gpu_available: number
  hourly_price: number
}

function formatGpuLabel(model: string, memGb: number | null) {
  const name = model.replace(/NVIDIA-/i, '').replace(/-/g, ' ')
  return memGb ? `${name} ${memGb}G` : name
}

function useGpuModels(nodeType?: string) {
  const [options, setOptions] = useState<GpuModelOption[]>([])
  const [loading, setLoading] = useState(true)
  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (nodeType) params.node_type = nodeType
      const { data } = await api.get<{ list: GpuModelOption[]; total: number }>('/instances/gpu-models', params)
      setOptions(data.list || [])
    } catch {
      setOptions([])
    } finally { setLoading(false) }
  }, [nodeType])
  useEffect(() => { fetchModels() }, [fetchModels])
  return { options, loading }
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
  // 智能体（openclaw）分类随功能屏蔽暂时隐藏，恢复时还原（见 TODO.md）
]

// ============ 容器实例规格（规格与定价由管理端配置，前端按 CPU:内存比例分组展示） =============
interface SpecOption { cpu: number; memory: number; label: string; price: number }
interface SpecGroup { key: string; label: string; desc: string; specs: SpecOption[] }

const SPEC_GROUP_META = [
  { key: 'general', ratio: 2, label: '通用型', desc: 'CPU:内存 = 1:2，适合大多数应用场景' },
  { key: 'compute', ratio: 1, label: '计算型', desc: 'CPU:内存 = 1:1，适合计算密集型任务' },
  { key: 'memory', ratio: 4, label: '内存型', desc: 'CPU:内存 = 1:4，适合内存密集型任务' },
]

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
  const [billingMode, setBillingMode] = useState('hourly')
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [resourceTypeFilter, setResourceTypeFilter] = useState('vGPU')
  // 云端（中心）节点资源目前很少、暂不对普通用户开放，普通用户只开放边缘调度；
  // 管理端保留全部选项便于内部验证。后续放开时把下面的 isAdmin 分支去掉即可
  const [nodeTypeFilter, setNodeTypeFilter] = useState('all')
  const [selectedGpu, setSelectedGpu] = useState<GpuModelOption | null>(null)
  const [instanceCount, setInstanceCount] = useState(1)
  const [dataDiskEnabled, setDataDiskEnabled] = useState(true)
  const [dataDiskMountPath, setDataDiskMountPath] = useState('/mnt/data')
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
  const [selectedSpec, setSelectedSpec] = useState<SpecOption | null>(null)
  const [specGroups, setSpecGroups] = useState<SpecGroup[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { options: gpuOptions, loading: modelsLoading } = useGpuModels(
    nodeTypeFilter !== 'all' ? nodeTypeFilter : undefined
  )
  const { images } = useImages()

  // 规格与定价：从管理端配置拉取（替代前端硬编码），按 CPU:内存比例分组
  useEffect(() => {
    api.get<{ list: { cpu_cores: number; memory_gb: number; spec_label: string; hourly_price: number }[] }>('/instances/spec-configs')
      .then(({ data }) => {
        const specs: SpecOption[] = (data.list || []).map(s => ({
          cpu: s.cpu_cores, memory: s.memory_gb, label: s.spec_label, price: s.hourly_price,
        }))
        const groups: SpecGroup[] = []
        SPEC_GROUP_META.forEach(meta => {
          const matched = specs.filter(s => s.memory / s.cpu === meta.ratio)
          if (matched.length) groups.push({ key: meta.key, label: meta.label, desc: meta.desc, specs: matched })
        })
        const rest = specs.filter(s => ![2, 1, 4].includes(s.memory / s.cpu))
        if (rest.length) groups.push({ key: 'other', label: '自定义', desc: '管理端自定义规格', specs: rest })
        setSpecGroups(groups)
      })
      .catch(() => setSpecGroups([]))
  }, [])

  // 规格加载完成后默认选中第一组第一项
  useEffect(() => {
    if (!selectedSpec && specGroups.length > 0) {
      setSpecType(specGroups[0].key)
      setSelectedSpec(specGroups[0].specs[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specGroups])

  // 管理端用户可指定部署节点（普通用户由系统自动调度）
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  // 普通用户隐藏「全部 / 中心」：选「全部」后端仍可能调度到中心节点，所以不能只隐藏「中心」选项，
  // 需要把值也强制到 'edge'，否则初始值 'all' 会绕过限制
  const nodeTypeOptions = isAdmin
    ? [{ value: 'all', label: '全部' }, { value: 'center', label: '中心' }, { value: 'edge', label: '边缘' }]
    : [{ value: 'edge', label: '边缘节点' }]
  useEffect(() => {
    if (!isAdmin && nodeTypeFilter !== 'edge') setNodeTypeFilter('edge')
  }, [isAdmin, nodeTypeFilter])
  const [nodeOptions, setNodeOptions] = useState<{ node_id: string; node_name: string; node_type: string }[]>([])
  const [selectedNode, setSelectedNode] = useState('')  // 空 = 自动调度
  useEffect(() => {
    if (!isAdmin) return
    api.get<{ list: any[] }>('/instances/resource-configs')
      .then(({ data }) => {
        const seen = new Map<string, { node_id: string; node_name: string; node_type: string }>()
        ;(data.list || []).forEach(c => {
          if (!seen.has(c.node_name)) seen.set(c.node_name, { node_id: c.node_id, node_name: c.node_name, node_type: c.node_type })
        })
        setNodeOptions([...seen.values()])
      })
      .catch(() => setNodeOptions([]))
  }, [isAdmin])

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

  // 当前所选资源单价：GPU 模式取所选型号价格；无卡模式实例价格已含在规格价中
  const gpuHourly = resourceTypeFilter === 'no_gpu' ? 0 : (selectedGpu?.hourly_price || 0)
  const totalHourly = ((selectedSpec?.price || 0) + gpuHourly) * instanceCount

  // 选中镜像的 CUDA 最低版本要求（镜像注册时配置），用于页面提示；
  // 后端创建时会据此自动调度到满足要求的节点并兜底校验
  const selectedMinCuda = imageCategory === 'external'
    ? ''
    : (images.find(i => i.name === selectedImage && i.tag === selectedImageTag)?.min_cuda_version || '')

  // 当前规格分组（切换 tab 用）
  const currentGroup = specGroups.find(g => g.key === specType) || specGroups[0]

  // 边缘节点由第三方提供算力、稳定性不受平台控制，预付整月/整年后节点长期离线只能走退款，
  // 因此只提供按量计费。选到边缘后自动回退，避免带着包月的选择提交被后端 400 拒绝
  const edgeOnly = nodeTypeFilter === 'edge'
  useEffect(() => {
    if (edgeOnly && billingMode !== 'hourly') setBillingMode('hourly')
  }, [edgeOnly, billingMode])

  const handleCreate = async () => {
    if (!instanceName.trim()) { toast.error('请输入实例名称'); return }
    if (resourceTypeFilter !== 'no_gpu' && !selectedGpu) { toast.error('请选择 GPU 型号'); return }
    if (!selectedImage) { toast.error('请选择镜像'); return }
    // 环境变量名在提交前再校一次：后端会 422 拒绝，提前拦下避免一次无效请求
    const badEnv = envVars.map(e => ({ key: e.key.trim(), err: validateEnvKey(e.key) })).find(x => x.err)
    if (badEnv) { toast.error(`环境变量 ${badEnv.key}：${badEnv.err}`); return }
    setCreating(true)
    try {
      const isNoGpu = resourceTypeFilter === 'no_gpu'
      // 普通用户按型号(标签)自动调度，不传 node_id，由后端选择节点
      const payload: any = {
        name: instanceName,
        gpu_count: isNoGpu ? 0 : 1,
        gpu_model: isNoGpu ? undefined : selectedGpu!.gpu_model,
        gpu_memory_gb: isNoGpu ? undefined : selectedGpu!.gpu_memory_gb,
        billing_type: billingMode,
        resource_type: isNoGpu ? 'no_gpu' : 'vGPU', node_type: nodeTypeFilter,
        // 管理端可指定节点；普通用户留空由后端自动调度
        node_id: isAdmin && selectedNode ? selectedNode : undefined,
        cpu_cores: selectedSpec!.cpu, memory_gb: selectedSpec!.memory,
        spec_type: specType, spec_label: selectedSpec!.label,
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
      if (storageMounts.length > 0) payload.storage_mounts = storageMounts.filter(s => s.name).map(s => ({ ...s, persistent: true }))
      payload.data_disk_enabled = dataDiskEnabled
      payload.data_disk_mount_path = dataDiskMountPath.trim() || '/mnt/data'
      await api.post<{ id: string }>('/instances', payload)
      toast.success('实例创建中，请稍候...')
      router.push('/instances')
    } catch { /* 错误详情已由全局 api 层 toast 展示，这里不再重复弹出 */ }
    finally { setCreating(false) }
  }

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
        <p className="text-sm text-muted-foreground mt-1">
          {resourceTypeFilter === 'no_gpu'
            ? '配置您的 CPU 容器实例，选择资源规格和镜像后即可一键创建。'
            : '配置您的 GPU 容器实例，选择资源规格和镜像后即可一键创建。'}
        </p>
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
            {specGroups.length === 0 ? (
              <div className="h-32 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <>
            <div className="flex gap-1 mb-1">
              {specGroups.map(group => (
                <button
                  key={group.key}
                  onClick={() => { setSpecType(group.key); setSelectedSpec(group.specs[0]) }}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                    specType === group.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >{group.label}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{currentGroup?.desc}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(currentGroup?.specs || []).map(spec => {
                const sel = selectedSpec?.cpu === spec.cpu && selectedSpec?.memory === spec.memory
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
              </>
            )}
          </CardContent>
        </Card>

        {/* ===== 镜像配置（置于资源配置之前：先定运行环境再选算力） ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.09s' }}>
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
                              // 只展示镜像地址 "/" 的最后一段（如 pytorch:2.1-cuda12），完整 URL 过长
                              <SelectItem key={img.id} value={img.tag}>{(img.image_url || `${img.name}:${img.tag}`).split('/').pop()}</SelectItem>
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
              {/* 选中镜像的 CUDA 要求提示：创建时后端会自动调度到满足要求的节点 */}
              {selectedMinCuda && (
                <p className="text-xs mt-2 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">CUDA ≥ {selectedMinCuda}</span>
                  <span className="text-muted-foreground">该镜像要求节点 CUDA 不低于 {selectedMinCuda}，系统将自动调度到满足要求的节点</span>
                </p>
              )}
            </FormRow>
          </CardContent>
        </Card>

        {/* ===== 资源配置 ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={Cpu} title="资源配置" desc="选择计算资源规格" />
          </CardHeader>
          <CardContent className="space-y-5">
            <FormRow label="计费模式">
              <div className="space-y-1.5">
                <ToggleGroup value={billingMode} onChange={setBillingMode} options={edgeOnly ? [{ value: 'hourly', label: '按需计费' }] : [{ value: 'hourly', label: '按需计费' }, { value: 'monthly', label: '包年包月' }]} />
                <p className="text-xs text-muted-foreground">
                  {billingMode === 'hourly' ? '按小时单价计费，按实际运行时长扣费，停止/删除即结清。' : '按月/年一次性付费，到期自动续费，价格更优惠。'}
                  <button type="button" onClick={() => setBillingDialogOpen(true)} className="text-primary ml-1 hover:underline">计费说明</button>
                </p>
                {edgeOnly && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">边缘节点暂不支持包年包月：算力由第三方节点提供，稳定性无法保证，按量计费只对实际在线时长收费。</p>
                )}
              </div>
            </FormRow>

            <Separator />

            <FormRow label="节点类型" required>
              <ToggleGroup
                value={nodeTypeFilter}
                onChange={setNodeTypeFilter}
                options={nodeTypeOptions}
              />
              {nodeTypeFilter === 'edge' ? (
                <div className="mt-2 rounded-md border border-orange-300/70 bg-orange-50 dark:bg-orange-950/30 px-3 py-2.5 text-xs text-orange-700 dark:text-orange-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    边缘节点来自贡献者的闲置算力，稳定性低于中心节点
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>节点可能随时休眠/掉线且无法预知；边缘节点如果离线超过 5 分钟，容器实例会被自动关机（离线期间不计费）</li>
                    <li>自动关机后，系统盘会被回滚，系统盘临时保存的数据将丢失，数据盘数据会被保存直到容器实例被删除</li>
                    <li>边缘节点没有公网 IP，不能提供持久的对外 API，请勿部署需要长期对外提供服务的应用</li>
                    <li>不适合长时间训练/推理等不可中断的超长任务，适合可重跑、容忍中断的短任务</li>
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {nodeTypeFilter === 'center' ? '中心节点提供高性能 GPU 算力，适合大规模训练。' : '显示所有可用节点（含边缘节点，边缘节点可能随时离线，请留意稳定性提示）。'}
                </p>
              )}
              {!isAdmin && (
                <p className="text-xs text-muted-foreground mt-1.5">云端节点算力建设中，暂未开放调度，当前仅提供边缘节点。</p>
              )}
            </FormRow>

            {/* 部署节点：仅管理端可见，普通用户由系统自动调度 */}
            {isAdmin && (
              <FormRow label="部署节点">
                <Select value={selectedNode || 'auto'} onValueChange={v => setSelectedNode(v === 'auto' ? '' : v)}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="选择部署节点" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">自动调度（推荐）</SelectItem>
                    {nodeOptions.map(n => (
                      <SelectItem key={n.node_id} value={n.node_id}>
                        {n.node_name}（{n.node_type === 'edge' ? '边缘' : '中心'}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">管理端可指定节点部署；选择自动调度则由系统按资源余量分配。</p>
              </FormRow>
            )}

            <FormRow label="资源类型" required>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { value: 'vGPU', label: 'GPU' },
                  { value: 'no_gpu', label: '无卡启动' },
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

            {/* GPU 型号选择：按标签自动调度，节点由系统分配（普通用户不可见节点信息） */}
            {resourceTypeFilter === 'vGPU' ? (
              modelsLoading ? (
                <div className="h-24 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : gpuOptions.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">暂无可用 GPU 型号</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gpuOptions.map(opt => {
                    const sel = selectedGpu?.gpu_model === opt.gpu_model && selectedGpu?.gpu_memory_gb === opt.gpu_memory_gb
                    const disabled = opt.gpu_available <= 0
                    return (
                      <div
                        key={`${opt.gpu_model}-${opt.gpu_memory_gb ?? 0}`}
                        onClick={() => !disabled && setSelectedGpu(sel ? null : opt)}
                        className={`relative flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          sel
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : disabled
                              ? 'border-border opacity-50 cursor-not-allowed'
                              : 'border-border hover:border-primary/40 hover:shadow-sm'
                        }`}
                      >
                        {sel && <div className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></div>}
                        <div className="text-base font-bold text-foreground">{formatGpuLabel(opt.gpu_model, opt.gpu_memory_gb)}</div>
                        <div className="text-xs text-muted-foreground">
                          可用 <span className={opt.gpu_available > 4 ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>{opt.gpu_available}</span> 卡 · 共 {opt.gpu_total} 卡
                        </div>
                        <div className="mt-1">
                          <span className="text-primary font-bold text-sm">¥{opt.hourly_price.toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground">/卡/时</span>
                        </div>
                        {disabled && <p className="text-[10px] text-red-400 flex items-center gap-0.5"><AlertCircle className="h-3 w-3" />暂无空闲卡</p>}
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 text-sm">
                无卡启动：仅使用 CPU/内存资源，系统自动分配节点，按所选规格计价
                {selectedSpec && (
                  <>
                    · <span className="text-primary font-bold ml-1">¥{selectedSpec.price.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">/时（{selectedSpec.label}）</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== 存储配置（默认区块） ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={HardDrive} title="存储配置" desc="持久数据盘" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow label="持久数据盘">
              <div className="flex items-center gap-2.5">
                <Switch checked={dataDiskEnabled} onCheckedChange={setDataDiskEnabled} />
                <span className="text-sm">{dataDiskEnabled ? '已开启' : '已关闭'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {dataDiskEnabled
                  ? '数据保存在节点磁盘的实例专属目录中，实例关机/重启、Pod 重建后数据不丢失（推荐开启）。'
                  : '关闭后仅使用临时存储，实例重启后数据将丢失。'}
              </p>
            </FormRow>
            {dataDiskEnabled && (
              <FormRow label="挂载路径">
                <Input className="max-w-xs font-mono" value={dataDiskMountPath} onChange={e => setDataDiskMountPath(e.target.value)} placeholder="/mnt/data" />
                <p className="text-xs text-muted-foreground mt-1.5">持久数据盘在容器内的挂载路径，默认 /mnt/data。</p>
              </FormRow>
            )}

            {/* 额外存储挂载暂时隐藏，保留代码便于后续恢复 */}
            {false && (
              <>
                <Separator />

                <FormRow label="额外存储挂载">
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
                    {/* 额外挂载默认路径避开数据盘默认的 /mnt/data，防止两个卷挂同一挂载点互相遮盖 */}
                    <Button variant="outline" size="sm" className="text-xs border-dashed" onClick={() => setStorageMounts([...storageMounts, { name: '', mount_path: '/mnt/storage', size_gb: 50 }])}>
                      <Plus className="h-3 w-3 mr-1" />添加存储挂载
                    </Button>
                    <p className="text-xs text-muted-foreground">额外挂载卷同样持久化保存，实例重启后数据不丢失。</p>
                  </div>
                </FormRow>
              </>
            )}
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
            <span className="text-xs">(安装源、启动命令、环境变量)</span>
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
        {/* ===== 环境变量 ===== */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-4">
            <SectionHeader icon={Terminal} title="环境变量" desc="配置注入容器的环境变量" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow label="环境变量">
              <div className="space-y-2">
                {envVars.map((ev, i) => {
                  const keyError = validateEnvKey(ev.key)
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex gap-2 items-center p-2 rounded-lg bg-muted/30 border border-dashed">
                        <Input className={`w-36 h-8 text-sm bg-background font-mono ${keyError ? 'border-red-500 focus-visible:ring-red-500' : ''}`} placeholder="KEY" value={ev.key} onChange={e => { const arr = [...envVars]; arr[i].key = e.target.value; setEnvVars(arr) }} />
                        <span className="text-muted-foreground">=</span>
                        <Input className="flex-1 h-8 text-sm bg-background font-mono" placeholder="VALUE" value={ev.value} onChange={e => { const arr = [...envVars]; arr[i].value = e.target.value; setEnvVars(arr) }} />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                      {keyError && <p className="text-xs text-red-400 pl-2">{keyError}</p>}
                    </div>
                  )
                })}
                <Button variant="outline" size="sm" className="text-xs border-dashed" onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}>
                  <Plus className="h-3 w-3 mr-1" />添加环境变量
                </Button>
                <p className="text-xs text-muted-foreground">系统会向容器计算环境注入相应的环境变量。NVIDIA_ 开头的变量由平台管理，不可自定义。</p>
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
                {currentGroup?.label || ''} · {selectedSpec.label}
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()} className="px-6">取消</Button>
            <Button onClick={handleCreate} disabled={creating || (resourceTypeFilter !== 'no_gpu' && !selectedGpu)} className="px-8 shadow-lg shadow-primary/25">
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />创建中...</> : <><Zap className="h-4 w-4 mr-1.5" />立即创建</>}
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 计费说明弹窗（与后端结算实现保持一致） ===== */}
      <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>计费说明</DialogTitle>
            <DialogDescription>以下为当前平台的实际计费规则</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className={`rounded-lg border p-3 space-y-1.5 ${billingMode === 'hourly' ? 'border-primary/40 bg-primary/5' : ''}`}>
              <p className="font-medium">按需计费（按量）</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                <li>按所选规格的小时单价（元/小时）计费，按实际运行时长扣费（精确到秒，按小时单价折算）</li>
                <li>实例进入「运行中」状态即开始计费；停止后不再计费；删除时一次性结清已产生费用</li>
                <li>运行不足 1 分钟免收费用</li>
                <li>启动时要求余额大于 0；欠费超过 10 元实例将被强制停止</li>
              </ul>
            </div>
            <div className={`rounded-lg border p-3 space-y-1.5 ${billingMode !== 'hourly' ? 'border-primary/40 bg-primary/5' : ''}`}>
              <p className="font-medium">包年包月</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                <li>创建时一次性支付包月/包年费用（小时单价 × 24 小时 × 30/365 天）</li>
                <li>有效期内不再按使用时长结算</li>
                <li>到期时余额充足自动续费延长；余额不足则实例进入已过期状态，可手动续费后重新启动</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-3">
              边缘节点提示：节点离线超过 5 分钟实例将被自动关机，离线期间不计费；系统盘会被回滚导致临时数据丢失，数据盘数据保留至实例删除。
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
