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

interface SpecItem {
  id: string
  cpu_cores: number
  memory_gb: number
  spec_label: string
  hourly_price: number
  enabled: boolean
  note: string | null
  updated_at: string | null
}

interface SpecForm {
  cpu_cores: string
  memory_gb: string
  hourly_price: string
  enabled: boolean
  note: string
}

const emptyForm: SpecForm = { cpu_cores: '', memory_gb: '', hourly_price: '0.1', enabled: true, note: '' }

// 按 CPU:内存 比例归类展示
function specTypeLabel(cpu: number, mem: number): string {
  const ratio = mem / cpu
  if (ratio === 2) return '通用型 1:2'
  if (ratio === 1) return '计算型 1:1'
  if (ratio === 4) return '内存型 1:4'
  return '自定义'
}

// 普通无卡规格面板：CPU/内存规格定价 CRUD
export default function SpecPanel() {
  const [items, setItems] = useState<SpecItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SpecForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get<{ list: SpecItem[] }>('/admin/spec-pricing')
      setItems(data.list || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (item: SpecItem) => {
    setEditingId(item.id)
    setForm({
      cpu_cores: String(item.cpu_cores),
      memory_gb: String(item.memory_gb),
      hourly_price: String(item.hourly_price),
      enabled: item.enabled,
      note: item.note || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const cpu = parseInt(form.cpu_cores)
    const mem = parseInt(form.memory_gb)
    if (isNaN(cpu) || cpu < 1) { toast.error('CPU 核数需为正整数'); return }
    if (isNaN(mem) || mem < 1) { toast.error('内存需为正整数 GB'); return }
    const price = parseFloat(form.hourly_price)
    if (isNaN(price) || price < 0) { toast.error('请输入有效的小时单价'); return }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/admin/spec-pricing/${editingId}`, {
          hourly_price: price, enabled: form.enabled, note: form.note || null,
        })
        toast.success('规格定价已更新')
      } else {
        await api.post('/admin/spec-pricing', {
          cpu_cores: cpu, memory_gb: mem,
          hourly_price: price, enabled: form.enabled, note: form.note || null,
        })
        toast.success('规格定价已创建')
      }
      setDialogOpen(false)
      fetchList()
    } catch (e: any) { toast.error(e?.response?.data?.detail || e?.message || '保存失败') }
    finally { setSaving(false) }
  }

  const handleToggle = async (item: SpecItem, enabled: boolean) => {
    try {
      await api.put(`/admin/spec-pricing/${item.id}`, { enabled })
      setItems(arr => arr.map(x => x.id === item.id ? { ...x, enabled } : x))
    } catch (e: any) { toast.error(e?.message || '操作失败') }
  }

  const handleDelete = async (item: SpecItem) => {
    if (!confirm(`确认删除 ${item.spec_label} 的定价？`)) return
    try {
      await api.delete(`/admin/spec-pricing/${item.id}`)
      toast.success('已删除')
      fetchList()
    } catch (e: any) { toast.error(e?.message || '删除失败') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          无卡实例按容器规格（CPU/内存）计费，创建页仅展示已启用的规格；未配置的规格按默认价计费。
        </p>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />新建规格</Button>
      </div>

      {/* 规格定价列表 */}
      <Card>
        <CardHeader><CardTitle className="text-base">规格列表</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              暂未配置规格，无卡实例按默认价计费
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规格</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>小时单价（元）</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.spec_label}</TableCell>
                    <TableCell><Badge variant="secondary">{specTypeLabel(item.cpu_cores, item.memory_gb)}</Badge></TableCell>
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

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑规格定价' : '新建规格'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CPU 核数 *</Label>
                <Input
                  type="number" min={1} placeholder="如 2"
                  value={form.cpu_cores}
                  disabled={!!editingId}
                  onChange={e => setForm(f => ({ ...f, cpu_cores: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>内存（GB）*</Label>
                <Input
                  type="number" min={1} placeholder="如 4"
                  value={form.memory_gb}
                  disabled={!!editingId}
                  onChange={e => setForm(f => ({ ...f, memory_gb: e.target.value }))}
                />
              </div>
            </div>
            {editingId && <p className="text-xs text-muted-foreground">规格（CPU/内存）创建后不可修改，如需变更请删除后重建。</p>}
            <div className="space-y-1.5">
              <Label>小时单价（元）*</Label>
              <Input
                type="number" min={0} step="0.01"
                value={form.hourly_price}
                onChange={e => setForm(f => ({ ...f, hourly_price: e.target.value }))}
              />
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
