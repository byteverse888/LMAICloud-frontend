'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Edit, Trash2, Store } from 'lucide-react'
import { useAdminMarketProducts } from '@/hooks/use-api'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface SpecsForm {
  gpu_model: string
  gpu_memory: string
  gpu_available: number
  gpu_total: number
  cpu_cores: number
  cpu_model: string
  memory: number
  disk: number
  gpu_driver: string
  cuda_version: string
  region: string
  node_type: string
  node_id: string
  member_price: number
  available_until: string
}

interface ProductForm {
  name: string
  category: string
  description: string
  icon: string
  specs: SpecsForm
  price: number
  sort_order: number
  is_active: boolean
}

const emptySpecs: SpecsForm = {
  gpu_model: '', gpu_memory: '', gpu_available: 0, gpu_total: 0,
  cpu_cores: 0, cpu_model: '', memory: 0, disk: 50,
  gpu_driver: '', cuda_version: '', region: '', node_type: 'center',
  node_id: '', member_price: 0, available_until: '长期可用',
}

const emptyForm: ProductForm = {
  name: '', category: 'compute', description: '', icon: '',
  specs: { ...emptySpecs }, price: 0, sort_order: 0, is_active: true,
}

/** 安全解析 specs JSON */
function parseSpecs(raw: any): SpecsForm {
  let obj: any = {}
  if (typeof raw === 'string') { try { obj = JSON.parse(raw) } catch { obj = {} } }
  else if (typeof raw === 'object' && raw) obj = raw
  return { ...emptySpecs, ...obj }
}

export default function AdminMarketPage() {
  const [category, setCategory] = useState<string>('all')
  const { products, loading, refresh } = useAdminMarketProducts(category === 'all' ? undefined : category)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, specs: { ...emptySpecs } })
    setDialogOpen(true)
  }

  const openEdit = (product: any) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      category: product.category,
      description: product.description || '',
      icon: product.icon || '',
      specs: parseSpecs(product.specs),
      price: product.price || 0,
      sort_order: product.sort_order || 0,
      is_active: product.is_active !== false,
    })
    setDialogOpen(true)
  }

  const updateSpecs = (field: keyof SpecsForm, value: any) => {
    setForm(prev => ({ ...prev, specs: { ...prev.specs, [field]: value } }))
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('请输入产品名称'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description,
        icon: form.icon,
        specs: JSON.stringify(form.specs),
        price: form.price,
        sort_order: form.sort_order,
        is_active: form.is_active,
      }
      if (editingId) {
        await api.put(`/admin/market/products/${editingId}`, payload)
        toast.success('更新成功')
      } else {
        await api.post('/admin/market/products', payload)
        toast.success('创建成功')
      }
      setDialogOpen(false)
      refresh()
    } catch { toast.error('保存失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该产品？')) return
    try {
      await api.delete(`/admin/market/products/${id}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
  }

  /** 简要展示产品规格 */
  const renderSpecsSummary = (raw: any) => {
    const s = parseSpecs(raw)
    const parts: string[] = []
    if (s.gpu_model) parts.push(s.gpu_model)
    if (s.gpu_memory) parts.push(s.gpu_memory)
    if (s.region) parts.push(s.region)
    return parts.join(' / ') || '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          算力市场
        </h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> 添加产品
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            <SelectItem value="compute">算力市场</SelectItem>
            <SelectItem value="ai_app">AI应用</SelectItem>
            <SelectItem value="ai_server">AI服务器</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>产品名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
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
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">暂无产品</TableCell>
                </TableRow>
              ) : (
                products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.icon && <img src={p.icon} alt="" className="h-8 w-8 rounded" />}
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.category === 'compute' ? '算力市场' : p.category === 'ai_server' ? 'AI服务器' : 'AI应用'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {renderSpecsSummary(p.specs)}
                    </TableCell>
                    <TableCell>¥{p.price}</TableCell>
                    <TableCell>{p.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'success' : 'secondary'}>
                        {p.is_active ? '上架' : '下架'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 创建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑产品' : '添加产品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>产品名称 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：RTX 4090 高性能实例" />
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compute">算力市场</SelectItem>
                    <SelectItem value="ai_app">AI应用</SelectItem>
                    <SelectItem value="ai_server">AI服务器</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="产品描述" />
            </div>

            {/* GPU 信息 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">GPU 信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">GPU型号</Label>
                  <Input value={form.specs.gpu_model} onChange={(e) => updateSpecs('gpu_model', e.target.value)} placeholder="如 RTX 4090" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GPU显存</Label>
                  <Input value={form.specs.gpu_memory} onChange={(e) => updateSpecs('gpu_memory', e.target.value)} placeholder="如 24GB" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">可用GPU数量</Label>
                  <Input type="number" value={form.specs.gpu_available} onChange={(e) => updateSpecs('gpu_available', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GPU总量</Label>
                  <Input type="number" value={form.specs.gpu_total} onChange={(e) => updateSpecs('gpu_total', Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">GPU驱动版本</Label>
                  <Input value={form.specs.gpu_driver} onChange={(e) => updateSpecs('gpu_driver', e.target.value)} placeholder="如 535.54" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CUDA版本</Label>
                  <Input value={form.specs.cuda_version} onChange={(e) => updateSpecs('cuda_version', e.target.value)} placeholder="如 12.1" />
                </div>
              </div>
            </div>

            {/* CPU / 内存 / 硬盘 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">计算与存储</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">CPU核数</Label>
                  <Input type="number" value={form.specs.cpu_cores} onChange={(e) => updateSpecs('cpu_cores', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CPU型号</Label>
                  <Input value={form.specs.cpu_model} onChange={(e) => updateSpecs('cpu_model', e.target.value)} placeholder="如 16核" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">内存(GB)</Label>
                  <Input type="number" value={form.specs.memory} onChange={(e) => updateSpecs('memory', Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">数据盘(GB)</Label>
                <Input type="number" value={form.specs.disk} onChange={(e) => updateSpecs('disk', Number(e.target.value))} />
              </div>
            </div>

            {/* 部署与价格 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">部署与价格</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">所属区域</Label>
                  <Input value={form.specs.region} onChange={(e) => updateSpecs('region', e.target.value)} placeholder="如 北京A区" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">节点类型</Label>
                  <Select value={form.specs.node_type} onValueChange={(v) => updateSpecs('node_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">中心节点</SelectItem>
                      <SelectItem value="edge">边缘节点</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">节点ID</Label>
                  <Input value={form.specs.node_id} onChange={(e) => updateSpecs('node_id', e.target.value)} placeholder="可选" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">标准价格(元/时)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">会员价(元/时)</Label>
                  <Input type="number" step="0.01" value={form.specs.member_price} onChange={(e) => updateSpecs('member_price', Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">可用期限</Label>
                <Input value={form.specs.available_until} onChange={(e) => updateSpecs('available_until', e.target.value)} placeholder="如 长期可用" />
              </div>
            </div>

            {/* 其他 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>图标URL</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="可选" />
              </div>
              <div className="space-y-2">
                <Label>排序(数字越小越靠前)</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>上架状态</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
