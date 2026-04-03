'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Edit, Trash2, MonitorCog } from 'lucide-react'
import { useAdminMarketProducts } from '@/hooks/use-api'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface SpecsForm {
  gpu_model: string
  gpu_memory: string
  gpu_count: number
  cpu_cores: number
  cpu_model: string
  memory: number
  disk: number
  bandwidth: string
  os: string
  region: string
}

interface ProductForm {
  name: string
  description: string
  icon: string
  specs: SpecsForm
  price: number
  price_unit: string
  sort_order: number
  is_active: boolean
}

const emptySpecs: SpecsForm = {
  gpu_model: '', gpu_memory: '', gpu_count: 1,
  cpu_cores: 0, cpu_model: '', memory: 0, disk: 0,
  bandwidth: '', os: '', region: '',
}

const emptyForm: ProductForm = {
  name: '', description: '', icon: '',
  specs: { ...emptySpecs }, price: 0, price_unit: '元/月',
  sort_order: 0, is_active: true,
}

function parseSpecs(raw: any): SpecsForm {
  let obj: any = {}
  if (typeof raw === 'string') { try { obj = JSON.parse(raw) } catch { obj = {} } }
  else if (typeof raw === 'object' && raw) obj = raw
  return { ...emptySpecs, ...obj }
}

export default function AdminAIServersPage() {
  const { products, loading, refresh } = useAdminMarketProducts('compute')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, specs: { ...emptySpecs } })
    setDialogOpen(true)
  }

  const openEdit = (p: any) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || '',
      icon: p.icon || '',
      specs: parseSpecs(p.specs),
      price: p.price || 0,
      price_unit: p.price_unit || '元/月',
      sort_order: p.sort_order || 0,
      is_active: p.is_active !== false,
    })
    setDialogOpen(true)
  }

  const updateSpecs = (field: keyof SpecsForm, value: any) => {
    setForm(prev => ({ ...prev, specs: { ...prev.specs, [field]: value } }))
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('请输入服务器名称'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        category: 'compute',
        description: form.description,
        icon: form.icon,
        specs: JSON.stringify(form.specs),
        price: form.price,
        price_unit: form.price_unit,
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
    if (!confirm('确定删除该服务器产品？')) return
    try {
      await api.delete(`/admin/market/products/${id}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
  }

  const renderSpecsSummary = (raw: any) => {
    const s = parseSpecs(raw)
    const parts: string[] = []
    if (s.gpu_model) parts.push(`${s.gpu_model}${s.gpu_count > 1 ? ` ×${s.gpu_count}` : ''}`)
    if (s.gpu_memory) parts.push(s.gpu_memory)
    if (s.memory) parts.push(`${s.memory}GB`)
    if (s.region) parts.push(s.region)
    return parts.join(' / ') || '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MonitorCog className="h-6 w-6 text-primary" />
          AI 服务器管理
        </h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> 添加服务器
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>服务器名称</TableHead>
                <TableHead>规格概要</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">暂无 AI 服务器产品</TableCell>
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
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                      {renderSpecsSummary(p.specs)}
                    </TableCell>
                    <TableCell>¥{p.price}/{p.price_unit?.replace('元/', '') || '月'}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑服务器' : '添加服务器'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>服务器名称 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：A100 AI 训练服务器" />
              </div>
              <div className="space-y-2">
                <Label>图标 URL</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="可选" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="服务器描述" rows={2} />
            </div>

            {/* GPU 信息 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">GPU 配置</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">GPU 型号</Label>
                  <Input value={form.specs.gpu_model} onChange={(e) => updateSpecs('gpu_model', e.target.value)} placeholder="如 A100" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GPU 显存</Label>
                  <Input value={form.specs.gpu_memory} onChange={(e) => updateSpecs('gpu_memory', e.target.value)} placeholder="如 80GB" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GPU 数量</Label>
                  <Input type="number" value={form.specs.gpu_count} onChange={(e) => updateSpecs('gpu_count', Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* CPU / 内存 / 存储 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">计算与存储</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">CPU 型号</Label>
                  <Input value={form.specs.cpu_model} onChange={(e) => updateSpecs('cpu_model', e.target.value)} placeholder="如 Intel Xeon" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CPU 核数</Label>
                  <Input type="number" value={form.specs.cpu_cores} onChange={(e) => updateSpecs('cpu_cores', Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">内存 (GB)</Label>
                  <Input type="number" value={form.specs.memory} onChange={(e) => updateSpecs('memory', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">存储 (GB)</Label>
                  <Input type="number" value={form.specs.disk} onChange={(e) => updateSpecs('disk', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">带宽</Label>
                  <Input value={form.specs.bandwidth} onChange={(e) => updateSpecs('bandwidth', e.target.value)} placeholder="如 1Gbps" />
                </div>
              </div>
            </div>

            {/* 部署信息 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">部署信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">操作系统</Label>
                  <Input value={form.specs.os} onChange={(e) => updateSpecs('os', e.target.value)} placeholder="如 Ubuntu 22.04" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">所在区域</Label>
                  <Input value={form.specs.region} onChange={(e) => updateSpecs('region', e.target.value)} placeholder="如 北京A区" />
                </div>
              </div>
            </div>

            {/* 价格与排序 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>价格</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>价格单位</Label>
                <Input value={form.price_unit} onChange={(e) => setForm({ ...form, price_unit: e.target.value })} placeholder="元/月" />
              </div>
              <div className="space-y-2">
                <Label>排序</Label>
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
