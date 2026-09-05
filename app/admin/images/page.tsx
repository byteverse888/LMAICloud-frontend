'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, MoreHorizontal, Edit, Trash2, Plus, Loader2, RefreshCw, Image as ImageIcon, Download } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface AppImage {
  id: string
  name: string
  tag: string
  category: string
  description: string
  icon: string
  image_url: string
  size_gb: number
  min_cuda_version?: string | null
  config: any
  status: string
  is_public: boolean
  sort_order: number
  created_at: string
}

const CATEGORIES = [
  { value: 'base', label: '基础镜像' },
  { value: 'app', label: '应用镜像' },
  { value: 'framework', label: 'AI框架' },
  { value: 'agent', label: '智能体' },
]

// CUDA 最小版本可选项（支持下拉选择，也支持手动输入任意版本，留空表示不限制）
const CUDA_OPTIONS = [
  { value: '11.8', label: 'CUDA ≥ 11.8' },
  { value: '12.1', label: 'CUDA ≥ 12.1' },
  { value: '12.2', label: 'CUDA ≥ 12.2' },
  { value: '12.4', label: 'CUDA ≥ 12.4' },
  { value: '12.6', label: 'CUDA ≥ 12.6' },
  { value: '12.8', label: 'CUDA ≥ 12.8' },
  { value: '13.0', label: 'CUDA ≥ 13.0' },
  { value: '13.2.0', label: 'CUDA ≥ 13.2.0' },
]

// CUDA 版本号格式：major / major.minor / major.minor.patch
const CUDA_VERSION_PATTERN = /^\d+(\.\d+){0,2}$/

// 智能体镜像 config 预设模板：注册时按名称/镜像地址自动带出，或点按钮一键填充。
// 避免手填漏掉 agent_type / command 导致容器起不来（hermes 缺 command 会回落交互式 TUI 而崩溃）。
const AGENT_CONFIG_PRESETS: { key: string; label: string; match: RegExp; config: Record<string, any> }[] = [
  {
    key: 'hermes',
    label: 'Hermes 智能体',
    match: /hermes/i,
    config: {
      agent_type: 'hermes',
      command: ['gateway', 'run'],
      port: 8642,
      health_path: '/health',
    },
  },
]

// 按镜像名称/地址匹配对应的智能体预设（无匹配返回 undefined）
function detectAgentPreset(name: string, imageUrl: string) {
  const hay = `${name || ''} ${imageUrl || ''}`
  return AGENT_CONFIG_PRESETS.find(p => p.match.test(hay))
}

export default function ImagesPage() {
  const [images, setImages] = useState<AppImage[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<AppImage | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchingSize, setFetchingSize] = useState(false)
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    category: 'base',
    description: '',
    icon: '',
    image_url: '',
    size_gb: 0,
    min_cuda_version: '',
    config: '',
    is_public: true,
    sort_order: 0,
  })

  // 每次打开弹窗只自动带出一次预设，避免覆盖管理员后续手改
  const autoFilledRef = useRef(false)

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { page, size: 20 }
      if (searchQuery) params.search = searchQuery
      if (categoryFilter !== 'all') params.category = categoryFilter
      
      const { data } = await api.get<{ list: AppImage[]; total: number }>('/admin/images', params)
      setImages(data.list || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('获取镜像列表失败:', err)
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, categoryFilter])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // 注册智能体镜像时，按名称/镜像地址自动带出对应 config 预设
  // （仅在 config 仍为空默认、且本次弹窗未自动填过时，避免覆盖手填/既有镜像配置）
  useEffect(() => {
    if (!dialogOpen || formData.category !== 'agent' || autoFilledRef.current) return
    const cfg = formData.config.trim()
    if (cfg !== '{}' && cfg !== '') return
    const preset = detectAgentPreset(formData.name, formData.image_url)
    if (preset) {
      autoFilledRef.current = true
      setFormData(prev => ({ ...prev, config: JSON.stringify(preset.config, null, 2) }))
    }
  }, [dialogOpen, formData.category, formData.name, formData.image_url, formData.config])

  const openCreateDialog = () => {
    setEditingImage(null)
    autoFilledRef.current = false
    setFormData({
      name: '',
      tag: 'latest',
      category: 'base',
      description: '',
      icon: '',
      image_url: '',
      size_gb: 0,
      min_cuda_version: '',
      config: '{}',
      is_public: true,
      sort_order: 0,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (image: AppImage) => {
    setEditingImage(image)
    autoFilledRef.current = false
    setFormData({
      name: image.name,
      tag: image.tag,
      category: image.category,
      description: image.description || '',
      icon: image.icon || '',
      image_url: image.image_url || '',
      size_gb: image.size_gb || 0,
      min_cuda_version: image.min_cuda_version || '',
      config: image.config ? JSON.stringify(image.config, null, 2) : '{}',
      is_public: image.is_public,
      sort_order: image.sort_order || 0,
    })
    setDialogOpen(true)
  }

  // 从 registry 自动获取镜像大小（同时后端会建议 CUDA 版本，仅在未选时自动填入）
  const handleFetchSize = async () => {
    const url = formData.image_url.trim()
    if (!url) {
      toast.error('请先填写 Docker 镜像地址')
      return
    }
    try {
      setFetchingSize(true)
      const { data } = await api.get<{ size_gb: number; suggested_min_cuda_version?: string | null }>(
        '/admin/images/inspect', { image_url: url }
      )
      setFormData(prev => ({
        ...prev,
        size_gb: data.size_gb,
        min_cuda_version: prev.min_cuda_version || (data.suggested_min_cuda_version ?? ''),
      }))
      toast.success(`镜像大小（压缩体积）: ${data.size_gb} GB`)
    } catch (err) {
      toast.error('获取镜像大小失败，请检查镜像地址是否可匿名访问')
    } finally {
      setFetchingSize(false)
    }
  }

  // 一键填充 config 预设模板（覆盖当前内容）
  const applyConfigPreset = (preset: { config: Record<string, any> }) => {
    setFormData(prev => ({ ...prev, config: JSON.stringify(preset.config, null, 2) }))
  }

  const handleSave = async () => {
    if (!formData.name || !formData.tag) {
      toast.error('请填写镜像名称和标签')
      return
    }
    if (formData.min_cuda_version && !CUDA_VERSION_PATTERN.test(formData.min_cuda_version)) {
      toast.error('CUDA版本格式错误，如 12.1 或 13.2.0')
      return
    }

    try {
      setSaving(true)
      let configObj = {}
      try {
        configObj = JSON.parse(formData.config || '{}')
      } catch {
        toast.error('配置JSON格式错误')
        return
      }

      const payload = {
        ...formData,
        config: configObj,
        min_cuda_version: formData.min_cuda_version || null,  // 空字符串转为 null（不限制）
      }

      if (editingImage) {
        await api.put(`/admin/images/${editingImage.id}`, payload)
        toast.success('镜像更新成功')
      } else {
        await api.post('/admin/images', payload)
        toast.success('镜像创建成功')
      }
      
      setDialogOpen(false)
      fetchImages()
    } catch (err) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个镜像吗？')) return
    
    try {
      await api.delete(`/admin/images/${id}`)
      toast.success('镜像已删除')
      fetchImages()
    } catch {
      // 删除失败的具体原因（如「镜像仍被智能体实例引用，无法删除」）已由 api 层
      // 统一弹出后端 detail，此处不再重复提示，避免「删除失败」+详细原因两条 toast
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.put(`/admin/images/${id}/status?status=${status}`)
      toast.success('状态已更新')
      fetchImages()
    } catch (err) {
      toast.error('状态更新失败')
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="success" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />启用</Badge>
    }
    return <Badge variant="secondary" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gray-400" />禁用</Badge>
  }

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat ? cat.label : category
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">镜像管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchImages} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            刷新
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            添加镜像
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="搜索镜像名称..." 
            className="pl-9" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>镜像名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>大小(压缩)</TableHead>
                <TableHead>CUDA要求</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : images.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                images.map((image) => (
                  <TableRow key={image.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          {image.icon ? (
                            <img src={image.icon} alt="" className="h-8 w-8 object-contain" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{image.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {image.description || image.image_url}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(image.category)}</Badge>
                    </TableCell>
                    <TableCell>{image.tag}</TableCell>
                    <TableCell>{image.size_gb > 0 ? `${image.size_gb} GB` : '-'}</TableCell>
                    <TableCell>{image.min_cuda_version ? <Badge variant="outline">≥ {image.min_cuda_version}</Badge> : <span className="text-muted-foreground">不限</span>}</TableCell>
                    <TableCell>{getStatusBadge(image.status)}</TableCell>
                    <TableCell>{image.created_at}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(image)}>
                            <Edit className="h-4 w-4 mr-2" />编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(image.id, image.status === 'active' ? 'inactive' : 'active')}>
                            {image.status === 'active' ? '禁用' : '启用'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(image.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑/创建弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingImage ? '编辑镜像' : '添加镜像'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>镜像名称 *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="如 PyTorch"
                />
              </div>
              <div className="space-y-2">
                <Label>标签/版本 *</Label>
                <Input 
                  value={formData.tag} 
                  onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))} 
                  placeholder="如 2.1-cuda12.1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>镜像大小(GB·压缩体积)</Label>
                <Input 
                  type="number" 
                  value={formData.size_gb} 
                  onChange={(e) => setFormData(prev => ({ ...prev, size_gb: Number(e.target.value) }))} 
                  placeholder="留空则自动获取"
                />
                <p className="text-xs text-muted-foreground">探测值为压缩后下载体积，解压后磁盘占用更大（约 2 倍）</p>
              </div>
              <div className="space-y-2">
                <Label>最小CUDA版本</Label>
                <Input
                  value={formData.min_cuda_version}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_cuda_version: e.target.value.trim() }))}
                  placeholder="不限制，如 12.1"
                  list="cuda-version-options"
                />
                <datalist id="cuda-version-options">
                  {CUDA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Docker镜像地址</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.image_url} 
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))} 
                  placeholder="如 pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime"
                />
                <Button type="button" variant="outline" onClick={handleFetchSize} disabled={fetchingSize} className="shrink-0">
                  {fetchingSize ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  获取大小
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">大小留空时保存会自动从镜像仓库探测；“获取大小”同时会根据 tag 建议 CUDA 版本。探测值为压缩体积，小于仓库页面显示的解压后大小</p>
            </div>
            <div className="space-y-2">
              <Label>图标URL</Label>
              <Input 
                value={formData.icon} 
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))} 
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                placeholder="镜像功能描述..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>配置 (JSON)</Label>
                {formData.category === 'agent' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">快速填充：</span>
                    {AGENT_CONFIG_PRESETS.map(p => (
                      <Button key={p.key} type="button" variant="outline" size="sm"
                        onClick={() => applyConfigPreset(p)}>
                        {p.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Textarea 
                value={formData.config} 
                onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))} 
                placeholder={formData.category === 'agent'
                  ? '{"agent_type": "hermes", "command": ["gateway", "run"], "port": 8642, "health_path": "/health", "capabilities": {"model_keys": true, "channels": true}, "dashboard": {"enabled": true, "port": 9119}}'
                  : '{"ports": [], "envs": {}, "volumes": []}'}
                rows={formData.category === 'agent' ? 8 : 4}
                className="font-mono text-sm"
              />
              {formData.category === 'agent' && (
                <p className="text-xs text-muted-foreground">智能体镜像配置：<strong>agent_type</strong> 决定环境变量注入（hermes 注入 API_SERVER_* 启用 8642）；<strong>command</strong> 是容器启动子命令（映射为 K8s args，hermes 为 ["gateway","run"]，填错会起不来）；port 为 API 端口；health_path 健康检查路径；capabilities 控制详情页能力模块；dashboard 控制台端口。名称或镜像地址含 "hermes" 时会自动带出模板。</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>排序</Label>
                <Input 
                  type="number" 
                  value={formData.sort_order} 
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: Number(e.target.value) }))} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
