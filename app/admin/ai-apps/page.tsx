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
import { Loader2, Plus, Edit, Trash2, AppWindow } from 'lucide-react'
import { useAdminMarketProducts } from '@/hooks/use-api'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface ProductForm {
  name: string
  description: string
  icon: string
  specs: string
  price: number
  price_unit: string
  sort_order: number
  is_active: boolean
}

const emptyForm: ProductForm = {
  name: '', description: '', icon: '', specs: '{}',
  price: 0, price_unit: '元/月', sort_order: 0, is_active: true,
}

function parseSpecsDisplay(raw: any): string {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!obj || typeof obj !== 'object') return '-'
    const parts: string[] = []
    Object.entries(obj).slice(0, 4).forEach(([k, v]) => { if (v) parts.push(`${k}: ${v}`) })
    return parts.join(' / ') || '-'
  } catch { return '-' }
}

export default function AdminAIAppsPage() {
  const { products, loading, refresh } = useAdminMarketProducts('ai_app')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (p: any) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || '',
      icon: p.icon || '',
      specs: typeof p.specs === 'string' ? p.specs : JSON.stringify(p.specs || {}, null, 2),
      price: p.price || 0,
      price_unit: p.price_unit || '元/月',
      sort_order: p.sort_order || 0,
      is_active: p.is_active !== false,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('请输入应用名称'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        category: 'ai_app',
        description: form.description,
        icon: form.icon,
        specs: form.specs,
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
    if (!confirm('确定删除该应用？')) return
    try {
      await api.delete(`/admin/market/products/${id}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AppWindow className="h-6 w-6 text-primary" />
          AI 应用管理
        </h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> 添加应用
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>应用名称</TableHead>
                <TableHead>描述</TableHead>
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
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">暂无 AI 应用</TableCell>
                </TableRow>
              ) : (
                products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.icon && <img src={p.icon} alt="" className="h-8 w-8 rounded" />}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{p.description || '-'}</TableCell>
                    <TableCell>{p.price > 0 ? `¥${p.price}/${p.price_unit?.replace('元/', '') || '月'}` : '免费'}</TableCell>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑应用' : '添加应用'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>应用名称 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：AI 绘画助手" />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="应用描述" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>图标 URL</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="可选，应用图标地址" />
            </div>
            <div className="space-y-2">
              <Label>规格参数 (JSON)</Label>
              <Textarea value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} placeholder='{"model": "GPT-4", "tokens": "128K"}' rows={3} className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>价格</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>价格单位</Label>
                <Input value={form.price_unit} onChange={(e) => setForm({ ...form, price_unit: e.target.value })} placeholder="元/月" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>排序 (数字越小越靠前)</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
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
