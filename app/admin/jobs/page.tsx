'use client'

import { useState } from 'react'
import { useAdminJobs, useAdminNamespaces } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Search, RefreshCw, Trash2, Loader2, Eye, Pencil, Plus, ListTodo } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { formatTime } from '@/lib/utils'

// 状态徽章样式映射
const statusBadgeMap: Record<string, { label: string; className: string }> = {
  running: { label: '运行中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  succeeded: { label: '已完成', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  failed: { label: '失败', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  pending: { label: '等待中', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  suspended: { label: '已暂停', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

export default function AdminJobsPage() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const ns = nsFilter === '__all__' ? undefined : nsFilter
  const { jobs, loading, total, refresh } = useAdminJobs(ns, search || undefined)
  const paged = paginateArray(jobs, currentPage, pageSize)

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  // 详情
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  // 创建
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '', namespace: 'lmaicloud', image: '', command: '',
    node_name: '', backoff_limit: 1, ttl_seconds_after_finished: 600, restart_policy: 'Never',
  })
  // 编辑（Job 仅 suspend/parallelism 可变）
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editForm, setEditForm] = useState({ suspend: false, parallelism: 1 })
  const [saving, setSaving] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/jobs/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const showDetail = async (nsName: string, name: string) => {
    setDetail({ name, namespace: nsName })
    try {
      setDetailLoading(true)
      const { data } = await api.get<any>(`/admin/jobs/${nsName}/${name}`)
      setDetail(data)
    } catch { toast.error('获取详情失败') }
    finally { setDetailLoading(false) }
  }

  const handleCreate = async () => {
    if (!createForm.image.trim()) { toast.error('请填写镜像'); return }
    try {
      setCreating(true)
      await api.post('/admin/jobs', {
        ...createForm,
        name: createForm.name.trim() || undefined,
        node_name: createForm.node_name.trim() || undefined,
        command: createForm.command.trim() || undefined,
      })
      toast.success('创建成功')
      setCreateOpen(false)
      setCreateForm({ name: '', namespace: 'lmaicloud', image: '', command: '', node_name: '', backoff_limit: 1, ttl_seconds_after_finished: 600, restart_policy: 'Never' })
      refresh()
    } catch { toast.error('创建失败') }
    finally { setCreating(false) }
  }

  const openEdit = (job: any) => {
    setEditTarget(job)
    setEditForm({ suspend: !!job.suspend, parallelism: job.parallelism ?? 1 })
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      setSaving(true)
      await api.patch(`/admin/jobs/${editTarget.namespace}/${editTarget.name}`, editForm)
      toast.success('更新成功')
      setEditTarget(null)
      refresh()
    } catch { toast.error('更新失败（Pod 模板等字段不可修改）') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-primary" />
          任务管理
        </h1>
        <p className="text-muted-foreground text-sm mt-1">管理 Kubernetes Job 一次性任务（创建 / 删除 / 暂停 / 查看）</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={nsFilter} onValueChange={v => { setNsFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部命名空间</SelectItem>
            {namespaces.map(n => <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索任务名称..." className="pl-9 h-9" value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setSearch(searchInput), setCurrentPage(1))} />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setSearch(searchInput); setCurrentPage(1) }}>
          <Search className="h-4 w-4 mr-1" />搜索
        </Button>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />刷新
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />新建任务
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">共 {total} 个</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>节点</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">暂无任务</TableCell></TableRow>
              ) : paged.map((job: any) => {
                const badge = statusBadgeMap[job.status] || statusBadgeMap.pending
                return (
                  <TableRow key={`${job.namespace}/${job.name}`}>
                    <TableCell className="font-mono text-xs font-medium">{job.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{job.namespace}</Badge></TableCell>
                    <TableCell><Badge className={`text-xs ${badge.className}`}>{badge.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.succeeded}/{job.completions ?? 1}
                      {job.active > 0 && <span className="ml-1 text-blue-500">({job.active} 运行)</span>}
                      {job.failed > 0 && <span className="ml-1 text-red-500">({job.failed} 失败)</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                      {job.node_name || '自动调度'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.created_at ? formatTime(job.created_at) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="查看详情"
                          onClick={() => showDetail(job.namespace, job.name)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="编辑（暂停/并发度）"
                          onClick={() => openEdit(job)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" title="删除"
                          onClick={() => setDeleteTarget({ ns: job.namespace, name: job.name })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > pageSize && (
        <Pagination page={currentPage} pageSize={pageSize} total={total}
          onPageChange={setCurrentPage} onPageSizeChange={s => { setPageSize(s); setCurrentPage(1) }} />
      )}

      {/* 新建任务 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建任务（Job）</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>任务名称（留空自动生成）</Label>
                <Input placeholder="admin-job-xxx" value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>命名空间</Label>
                <Select value={createForm.namespace} onValueChange={v => setCreateForm({ ...createForm, namespace: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {namespaces.map(n => <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>镜像 *</Label>
              <Input placeholder="docker.io/library/busybox:1.36"
                value={createForm.image} onChange={e => setCreateForm({ ...createForm, image: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>执行命令（shell，留空则使用镜像默认入口）</Label>
              <Textarea rows={3} placeholder="echo hello" className="font-mono text-xs"
                value={createForm.command} onChange={e => setCreateForm({ ...createForm, command: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>指定节点（留空由调度器决定；边缘节点会自动添加容忍度）</Label>
              <Input placeholder="edge-node-01" value={createForm.node_name}
                onChange={e => setCreateForm({ ...createForm, node_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>失败重试次数</Label>
                <Input type="number" min={0} value={createForm.backoff_limit}
                  onChange={e => setCreateForm({ ...createForm, backoff_limit: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>完成后自动清理（秒）</Label>
                <Input type="number" min={0} value={createForm.ttl_seconds_after_finished}
                  onChange={e => setCreateForm({ ...createForm, ttl_seconds_after_finished: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>重启策略</Label>
                <Select value={createForm.restart_policy} onValueChange={v => setCreateForm({ ...createForm, restart_policy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Never">Never</SelectItem>
                    <SelectItem value="OnFailure">OnFailure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑任务：K8s Job 仅 suspend / parallelism 可变 */}
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>编辑任务 - {editTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>暂停任务</Label>
                <p className="text-xs text-muted-foreground mt-0.5">暂停后不会创建新的 Pod，已运行的 Pod 继续执行</p>
              </div>
              <Switch checked={editForm.suspend} onCheckedChange={v => setEditForm({ ...editForm, suspend: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>并行度（parallelism）</Label>
              <Input type="number" min={0} value={editForm.parallelism}
                onChange={e => setEditForm({ ...editForm, parallelism: Number(e.target.value) || 0 })} />
            </div>
            <p className="text-xs text-muted-foreground">注：Kubernetes 限制，Job 的镜像、命令、completions 等字段创建后不可修改；如需变更请删除后重建。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除任务</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除任务「{deleteTarget?.ns}/{deleteTarget?.name}」吗？关联的 Pod 会一并删除，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 详情弹窗 */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="pr-8">任务详情 - {detail?.namespace}/{detail?.name}</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">状态：</span>{(statusBadgeMap[detail.status] || {}).label || detail.status}</div>
                <div><span className="text-muted-foreground">进度：</span>{detail.succeeded}/{detail.completions ?? 1}</div>
                <div><span className="text-muted-foreground">并行度：</span>{detail.parallelism ?? '-'}</div>
                <div><span className="text-muted-foreground">失败重试上限：</span>{detail.backoff_limit ?? '-'}</div>
                <div><span className="text-muted-foreground">指定节点：</span>{detail.node_name || '自动调度'}</div>
                <div><span className="text-muted-foreground">暂停：</span>{detail.suspend ? '是' : '否'}</div>
                <div><span className="text-muted-foreground">创建时间：</span>{detail.created_at ? formatTime(detail.created_at) : '-'}</div>
                <div><span className="text-muted-foreground">开始时间：</span>{detail.start_time ? formatTime(detail.start_time) : '-'}</div>
                <div><span className="text-muted-foreground">完成时间：</span>{detail.completion_time ? formatTime(detail.completion_time) : '-'}</div>
              </div>

              {detail.containers?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">容器</h4>
                  <div className="space-y-2">
                    {detail.containers.map((c: any, i: number) => (
                      <div key={i} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 text-xs font-mono font-medium border-b">{c.name}</div>
                        <div className="px-3 py-2 text-xs font-mono space-y-1 bg-background">
                          <div className="break-all"><span className="text-muted-foreground">镜像：</span>{c.image}</div>
                          {c.command?.length > 0 && (
                            <pre className="whitespace-pre-wrap break-all text-muted-foreground">{c.command.join(' ')}</pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.labels && Object.keys(detail.labels).length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Labels</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.labels).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-xs font-mono">{k}={String(v)}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {detail.spec_raw && Object.keys(detail.spec_raw).length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">完整 Spec</h4>
                  <pre className="border rounded-lg px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto bg-background">
                    {JSON.stringify(detail.spec_raw, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
