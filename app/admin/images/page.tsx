'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Search, MoreHorizontal, Edit, Trash2, Plus, Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react'
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
  { value: 'openclaw', label: 'OpenClaw镜像' },
]

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
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    category: 'base',
    description: '',
    icon: '',
    image_url: '',
    size_gb: 0,
    config: '',
    is_public: true,
    sort_order: 0,
  })

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

  const openCreateDialog = () => {
    setEditingImage(null)
    setFormData({
      name: '',
      tag: 'latest',
      category: 'base',
      description: '',
      icon: '',
      image_url: '',
      size_gb: 0,
      config: '{}',
      is_public: true,
      sort_order: 0,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (image: AppImage) => {
    setEditingImage(image)
    setFormData({
      name: image.name,
      tag: image.tag,
      category: image.category,
      description: image.description || '',
      icon: image.icon || '',
      image_url: image.image_url || '',
      size_gb: image.size_gb || 0,
      config: image.config ? JSON.stringify(image.config, null, 2) : '{}',
      is_public: image.is_public,
      sort_order: image.sort_order || 0,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.tag) {
      toast.error('请填写镜像名称和标签')
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
    } catch (err) {
      toast.error('删除失败')
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
                <TableHead>大小</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : images.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label>镜像大小(GB)</Label>
                <Input 
                  type="number" 
                  value={formData.size_gb} 
                  onChange={(e) => setFormData(prev => ({ ...prev, size_gb: Number(e.target.value) }))} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Docker镜像地址</Label>
              <Input 
                value={formData.image_url} 
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))} 
                placeholder="如 pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime"
              />
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
              <Label>配置 (JSON)</Label>
              <Textarea 
                value={formData.config} 
                onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))} 
                placeholder='{"ports": [], "envs": {}, "volumes": []}'
                rows={4}
                className="font-mono text-sm"
              />
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
