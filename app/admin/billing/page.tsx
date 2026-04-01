'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, RefreshCw, Package } from 'lucide-react'
import { useAdminResourcePlans } from '@/hooks/use-api'

interface PlanForm {
  name: string
  description: string
  plan_type: string
  billing_cycle: string
  cpu_cores: number
  memory_gb: number
  gpu_count: number
  gpu_model: string
  disk_gb: number
  price: number
  original_price: number
  is_active: boolean
  sort_order: number
}

const defaultForm: PlanForm = {
  name: '',
  description: '',
  plan_type: 'package',
  billing_cycle: 'monthly',
  cpu_cores: 0,
  memory_gb: 0,
  gpu_count: 0,
  gpu_model: '',
  disk_gb: 0,
  price: 0,
  original_price: 0,
  is_active: true,
  sort_order: 0,
}

export default function BillingManagePage() {
  const { plans, loading, refresh, createPlan, updatePlan, deletePlan } = useAdminResourcePlans()
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlanForm>({ ...defaultForm })
  const [saving, setSaving] = useState(false)

  const handleCreate = () => {
    setEditingId(null)
    setForm({ ...defaultForm })
    setShowDialog(true)
  }

  const handleEdit = (plan: any) => {
    setEditingId(plan.id)
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      plan_type: plan.plan_type || 'package',
      billing_cycle: plan.billing_cycle || 'monthly',
      cpu_cores: plan.cpu_cores || 0,
      memory_gb: plan.memory_gb || 0,
      gpu_count: plan.gpu_count || 0,
      gpu_model: plan.gpu_model || '',
      disk_gb: plan.disk_gb || 0,
      price: plan.price || 0,
      original_price: plan.original_price || 0,
      is_active: plan.is_active ?? true,
      sort_order: plan.sort_order || 0,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingId) {
        await updatePlan(editingId, form)
      } else {
        await createPlan(form)
      }
      setShowDialog(false)
      refresh()
    } catch (e) {
      console.error('Save plan failed:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该套餐吗？')) return
    try {
      await deletePlan(id)
      refresh()
    } catch (e) {
      console.error('Delete plan failed:', e)
    }
  }

  const handleToggleActive = async (plan: any) => {
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active })
      refresh()
    } catch (e) {
      console.error('Toggle plan failed:', e)
    }
  }

  const getBillingCycleLabel = (cycle: string) => {
    const map: Record<string, string> = {
      hourly: '按小时', daily: '按天', monthly: '包月', yearly: '包年',
    }
    return map[cycle] || cycle
  }

  const getPlanTypeLabel = (type: string) => {
    return type === 'package' ? '固定套餐' : '自定义单价'
  }

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">计费管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            刷新
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新增套餐
          </Button>
        </div>
      </div>

      {/* 套餐列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>周期</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
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
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      <span>暂无套餐，点击"新增套餐"创建</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPlanTypeLabel(plan.plan_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {plan.gpu_count > 0 && <span>GPU:{plan.gpu_count}x{plan.gpu_model} </span>}
                      {plan.cpu_cores > 0 && <span>CPU:{plan.cpu_cores}核 </span>}
                      {plan.memory_gb > 0 && <span>内存:{plan.memory_gb}GB </span>}
                      {plan.disk_gb > 0 && <span>磁盘:{plan.disk_gb}GB</span>}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-primary">¥{Number(plan.price || 0).toFixed(2)}</span>
                        {plan.original_price > plan.price && (
                          <span className="text-xs text-muted-foreground line-through ml-1">¥{Number(plan.original_price).toFixed(2)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getBillingCycleLabel(plan.billing_cycle)}</TableCell>
                    <TableCell>{plan.sort_order}</TableCell>
                    <TableCell>
                      <Badge
                        variant={plan.is_active ? 'default' : 'secondary'}
                        className={`cursor-pointer ${plan.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                        onClick={() => handleToggleActive(plan)}
                      >
                        {plan.is_active ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(plan.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 创建/编辑弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑套餐' : '新增套餐'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>套餐名称</Label>
                <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="如：入门版" />
              </div>
              <div className="space-y-2">
                <Label>套餐类型</Label>
                <Select value={form.plan_type} onValueChange={(v) => updateField('plan_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="package">固定套餐</SelectItem>
                    <SelectItem value="custom">自定义单价</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="套餐描述" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>计费周期</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => updateField('billing_cycle', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">按小时</SelectItem>
                    <SelectItem value="daily">按天</SelectItem>
                    <SelectItem value="monthly">包月</SelectItem>
                    <SelectItem value="yearly">包年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>排序</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => updateField('sort_order', Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>CPU核数</Label>
                <Input type="number" value={form.cpu_cores} onChange={(e) => updateField('cpu_cores', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>内存(GB)</Label>
                <Input type="number" value={form.memory_gb} onChange={(e) => updateField('memory_gb', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>GPU数量</Label>
                <Input type="number" value={form.gpu_count} onChange={(e) => updateField('gpu_count', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>磁盘(GB)</Label>
                <Input type="number" value={form.disk_gb} onChange={(e) => updateField('disk_gb', Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>GPU型号</Label>
              <Input value={form.gpu_model} onChange={(e) => updateField('gpu_model', e.target.value)} placeholder="如：NVIDIA A100" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>售价(元)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => updateField('price', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>原价(元)</Label>
                <Input type="number" step="0.01" value={form.original_price} onChange={(e) => updateField('original_price', Number(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
