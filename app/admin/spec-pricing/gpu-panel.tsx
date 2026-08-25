'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface PricingItem {
  id: string
  model_name: string
  gpu_memory_gb: number | null
  hourly_price: number
  enabled: boolean
  note: string | null
  updated_at: string | null
}

interface OnlineGpuModel {
  gpu_model: string
  gpu_memory_gb: number | null
  gpu_total: number
  gpu_available: number
  hourly_price: number
}

interface PricingForm {
  model_name: string
  gpu_memory_gb: string
  hourly_price: string
  enabled: boolean
  note: string
}

const emptyForm: PricingForm = { model_name: '', gpu_memory_gb: '', hourly_price: '1.0', enabled: true, note: '' }

// 显卡定价面板：按 GPU 型号(+显存规格)定价 CRUD
export default function GpuPanel() {
  const [items, setItems] = useState<PricingItem[]>([])
  const [onlineModels, setOnlineModels] = useState<OnlineGpuModel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PricingForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get<{ list: PricingItem[] }>('/admin/gpu-pricing')
      setItems(data.list || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const fetchOnlineModels = useCallback(async () => {
    try {
      const { data } = await api.get<{ list: OnlineGpuModel[] }>('/instances/gpu-models')
      setOnlineModels(data.list || [])
    } catch { setOnlineModels([]) }
  }, [])

  useEffect(() => { fetchList(); fetchOnlineModels() }, [fetchList, fetchOnlineModels])

  const openCreate = (prefill?: OnlineGpuModel) => {
    setEditingId(null)
    setForm(prefill
      ? { ...emptyForm, model_name: prefill.gpu_model, gpu_memory_gb: prefill.gpu_memory_gb ? String(prefill.gpu_memory_gb) : '' }
      : { ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (item: PricingItem) => {
    setEditingId(item.id)
    setForm({
      model_name: item.model_name,
      gpu_memory_gb: item.gpu_memory_gb != null ? String(item.gpu_memory_gb) : '',
      hourly_price: String(item.hourly_price),
      enabled: item.enabled,
      note: item.note || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.model_name.trim()) { toast.error('请输入 GPU 型号'); return }
    const price = parseFloat(form.hourly_price)
    if (isNaN(price) || price < 0) { toast.error('请输入有效的小时单价'); return }
    const memGb = form.gpu_memory_gb.trim() ? parseInt(form.gpu_memory_gb) : null
    if (form.gpu_memory_gb.trim() && (isNaN(memGb as number) || (memGb as number) <= 0)) {
      toast.error('显存规格需为正整数 GB'); return
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/admin/gpu-pricing/${editingId}`, {
          gpu_memory_gb: memGb, hourly_price: price, enabled: form.enabled, note: form.note || null,
        })
        toast.success('定价已更新')
      } else {
        await api.post('/admin/gpu-pricing', {
          model_name: form.model_name.trim(), gpu_memory_gb: memGb,
          hourly_price: price, enabled: form.enabled, note: form.note || null,
        })
        toast.success('定价已创建')
      }
      setDialogOpen(false)
      fetchList()
    } catch (e: any) { toast.error(e?.message || '保存失败') }
    finally { setSaving(false) }
  }

  const handleToggle = async (item: PricingItem, enabled: boolean) => {
    try {
      await api.put(`/admin/gpu-pricing/${item.id}`, { enabled })
      setItems(arr => arr.map(x => x.id === item.id ? { ...x, enabled } : x))
    } catch (e: any) { toast.error(e?.message || '操作失败') }
  }

  const handleDelete = async (item: PricingItem) => {
    if (!confirm(`确认删除 ${item.model_name} 的定价？`)) return
    try {
      await api.delete(`/admin/gpu-pricing/${item.id}`)
      toast.success('已删除')
      fetchList()
    } catch (e: any) { toast.error(e?.message || '删除失败') }
  }

  // 在线但尚未配置定价的型号（快捷添加）
  const pricedKeys = new Set(items.map(i => `${i.model_name}|${i.gpu_memory_gb ?? ''}`))
  const pricedModelNames = new Set(items.map(i => i.model_name))
  // Laptop 变体（如 RTX-4070-Laptop-GPU）已按桌面版基础型号价 ×70% 计价，不再列入未定价清单
  const isLaptopOfPricedBase = (model: string) => {
    const idx = model.toLowerCase().indexOf('-laptop')
    if (idx <= 0) return false
    const base = model.slice(0, idx)
    return pricedModelNames.has(base) || pricedModelNames.has(base.replace(/-/g, ' '))
  }
  const unpricedModels = onlineModels.filter(m =>
    !pricedKeys.has(`${m.gpu_model}|${m.gpu_memory_gb ?? ''}`) && !isLaptopOfPricedBase(m.gpu_model))

  const formatModel = (name: string) => name.replace(/NVIDIA-/i, '').replace(/-/g, ' ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          GPU 实例按型号（+显存规格）计价；笔记本变体卡按同型号桌面卡价 70% 计费；
          定价表未收录的型号暂按显存 0.2 元/GB/时兜底计价，无显存信息时按默认价 ¥1.00/卡/时。
        </p>
        <Button onClick={() => openCreate()}><Plus className="h-4 w-4 mr-1.5" />新建定价</Button>
      </div>

      {/* 定价列表 */}
      <Card>
        <CardHeader><CardTitle className="text-base">定价列表</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              暂未配置定价，未收录型号暂按显存 0.2 元/GB/时兜底计价
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GPU 型号</TableHead>
                  <TableHead>显存规格</TableHead>
                  <TableHead>小时单价（元/卡）</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{formatModel(item.model_name)}</TableCell>
                    <TableCell>{item.gpu_memory_gb != null ? `${item.gpu_memory_gb} GB` : <Badge variant="secondary">通用</Badge>}</TableCell>
                    <TableCell className="text-primary font-semibold">¥{item.hourly_price.toFixed(2)}</TableCell>
                    <TableCell><Switch checked={item.enabled} onCheckedChange={v => handleToggle(item, v)} /></TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{item.note || '--'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 在线未定价型号快捷入口 */}
      {unpricedModels.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">在线未定价型号（点击快捷添加）</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unpricedModels.map(m => (
              <button
                key={`${m.gpu_model}-${m.gpu_memory_gb ?? 0}`}
                onClick={() => openCreate(m)}
                className="px-3 py-1.5 text-xs rounded-full border border-border hover:border-primary/40 hover:text-primary transition-all"
              >
                {formatModel(m.gpu_model)}{m.gpu_memory_gb ? ` ${m.gpu_memory_gb}G` : ''}
                <span className="text-muted-foreground ml-1">({m.gpu_total}卡)</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑定价' : '新建定价'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>GPU 型号 *</Label>
              <Input
                list="online-gpu-models"
                placeholder="与节点标签一致，如 NVIDIA-GeForce-RTX-3090"
                value={form.model_name}
                disabled={!!editingId}
                onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))}
              />
              <datalist id="online-gpu-models">
                {onlineModels.map(m => <option key={`${m.gpu_model}-${m.gpu_memory_gb}`} value={m.gpu_model} />)}
              </datalist>
              <p className="text-xs text-muted-foreground">需与节点上报的 nvidia.com/gpu.product 标签值一致</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>显存规格（GB）</Label>
                <Input
                  type="number" min={1} placeholder="留空 = 该型号通用价"
                  value={form.gpu_memory_gb}
                  onChange={e => setForm(f => ({ ...f, gpu_memory_gb: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>小时单价（元/卡）*</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={form.hourly_price}
                  onChange={e => setForm(f => ({ ...f, hourly_price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input placeholder="可选" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
              <Label>启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
