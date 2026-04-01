'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface ProductForm {
  name: string
  category: string
  description: string
  icon: string
  specs: string
  price: number
  sort_order: number
  is_active: boolean
}

const emptyForm: ProductForm = {
  name: '', category: 'compute', description: '', icon: '', specs: '{}', price: 0, sort_order: 0, is_active: true,
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
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (product: any) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      category: product.category,
      description: product.description || '',
      icon: product.icon || '',
      specs: typeof product.specs === 'string' ? product.specs : (product.specs ? JSON.stringify(product.specs) : '{}'),
      price: product.price || 0,
      sort_order: product.sort_order || 0,
      is_active: product.is_active !== false,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('请输入产品名称'); return }
    try { JSON.parse(form.specs) } catch { toast.error('规格JSON格式错误'); return }
    setSaving(true)
    try {
      const payload = { ...form }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          市场管理
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
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">暂无产品</TableCell>
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
                      <Badge variant="secondary">{p.category === 'compute' ? '算力市场' : 'AI应用'}</Badge>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑产品' : '添加产品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>产品名称</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compute">算力市场</SelectItem>
                    <SelectItem value="ai_app">AI应用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>价格(元)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>图标URL</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="可选" />
              </div>
              <div className="space-y-2">
                <Label>排序</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>规格(JSON)</Label>
              <Input value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} placeholder='{"gpu": "RTX 4090", "memory": "24GB"}' />
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
