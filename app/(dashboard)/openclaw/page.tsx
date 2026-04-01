'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Plus, Search, MoreHorizontal,
  Power, PowerOff, Trash2, Loader2, Bot,
  Cpu, HardDrive, Globe, Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { useOpenClawInstances } from '@/hooks/use-openclaw'
import toast from 'react-hot-toast'

const getStatusBadge = (status: string) => {
  const cfg: Record<string, { label: string; variant: any; dot: string }> = {
    running: { label: '运行中', variant: 'success', dot: 'bg-emerald-500' },
    stopped: { label: '已停止', variant: 'secondary', dot: 'bg-gray-400' },
    creating: { label: '创建中', variant: 'outline', dot: 'bg-blue-500' },
    error: { label: '异常', variant: 'destructive', dot: 'bg-red-500' },
    releasing: { label: '删除中', variant: 'warning', dot: 'bg-amber-500' },
    released: { label: '已删除', variant: 'secondary', dot: 'bg-gray-400' },
  }
  const c = cfg[status] || { label: status, variant: 'secondary', dot: 'bg-gray-400' }
  const isTransient = ['creating', 'releasing'].includes(status)
  const isActive = status === 'running'
  return (
    <Badge variant={c.variant} className="gap-1.5">
      <span className="relative flex h-2 w-2">
        {(isActive || isTransient) && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${c.dot} ${isTransient ? 'animate-ping' : 'animate-pulse'}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`} />
      </span>
      {c.label}
    </Badge>
  )
}

export default function OpenClawPage() {
  const { instances, loading, refresh, createInstance, startInstance, stopInstance, deleteInstance } = useOpenClawInstances()

  // 搜索 & 筛选
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 创建弹窗
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '', node_type: 'center', cpu_cores: 2, memory_gb: 4, disk_gb: 20, image_url: '', port: 18789,
  })

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredInstances = useMemo(() => {
    let list = instances
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.id.includes(q))
    }
    if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter)
    }
    return list
  }, [instances, searchQuery, statusFilter])

  const pagedInstances = paginateArray(filteredInstances, currentPage, pageSize)

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('请输入实例名称'); return }
    try {
      setCreating(true)
      await createInstance({
        name: form.name.trim(),
        node_type: form.node_type,
        cpu_cores: form.cpu_cores,
        memory_gb: form.memory_gb,
        disk_gb: form.disk_gb,
        image_url: form.image_url || undefined,
        port: form.port,
      })
      toast.success('实例创建中')
      setShowCreate(false)
      setForm({ name: '', node_type: 'center', cpu_cores: 2, memory_gb: 4, disk_gb: 20, image_url: '', port: 18789 })
    } catch { toast.error('创建失败') }
    finally { setCreating(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await deleteInstance(deleteTarget.id)
      toast.success('实例删除中')
      setDeleteTarget(null)
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  const handleStart = async (id: string) => {
    try { await startInstance(id); toast.success('启动中') } catch { toast.error('启动失败') }
  }

  const handleStop = async (id: string) => {
    try { await stopInstance(id); toast.success('已停止') } catch { toast.error('停止失败') }
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> AI Agent 实例
          </h1>
          <p className="text-muted-foreground text-sm mt-1">管理 OpenClaw AI Agent 实例</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 刷新
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> 创建实例
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索实例名称..." className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="状态筛选" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="running">运行中</SelectItem>
            <SelectItem value="stopped">已停止</SelectItem>
            <SelectItem value="creating">创建中</SelectItem>
            <SelectItem value="error">异常</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 实例表格 */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>节点类型</TableHead>
                <TableHead>配置</TableHead>
                <TableHead>端口</TableHead>
                <TableHead>内网 IP</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right w-[60px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : pagedInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Bot className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">暂无 AI Agent 实例</p>
                      <Button size="sm" className="mt-1" onClick={() => setShowCreate(true)}>
                        <Plus className="h-4 w-4 mr-1" /> 创建实例
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pagedInstances.map(inst => (
                  <TableRow key={inst.id} className="hover:bg-primary/3 transition-colors">
                    <TableCell>
                      <Link href={`/openclaw/${inst.id}`} className="font-medium hover:text-primary transition-colors">
                        {inst.name}
                      </Link>
                    </TableCell>
                    <TableCell>{getStatusBadge(inst.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {inst.node_type === 'edge' ? <Globe className="h-3 w-3" /> : <Server className="h-3 w-3" />}
                        {inst.node_type === 'edge' ? '边缘' : '云端'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        <div className="flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground" />{inst.cpu_cores}核 / {inst.memory_gb}GB</div>
                        <div className="flex items-center gap-1"><HardDrive className="h-3 w-3 text-muted-foreground" />{inst.disk_gb}GB</div>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{inst.port}</code></TableCell>
                    <TableCell><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{inst.internal_ip || '-'}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inst.created_at ? new Date(inst.created_at).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStart(inst.id)} disabled={!['stopped', 'error'].includes(inst.status)}>
                            <Power className="h-4 w-4 mr-2" />启动
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStop(inst.id)} disabled={inst.status !== 'running'}>
                            <PowerOff className="h-4 w-4 mr-2" />停止
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => setDeleteTarget({ id: inst.id, name: inst.name })} disabled={['releasing', 'released'].includes(inst.status)}>
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
        </div>
      </Card>

      {/* 分页 */}
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={filteredInstances.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />

      {/* 创建弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> 创建 AI Agent 实例</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>实例名称 *</Label>
              <Input placeholder="my-agent" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>节点类型</Label>
                <Select value={form.node_type} onValueChange={v => setForm(f => ({ ...f, node_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">云端节点</SelectItem>
                    <SelectItem value="edge">边缘节点</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>端口</Label>
                <Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 18789 }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>CPU (核)</Label>
                <Input type="number" value={form.cpu_cores} onChange={e => setForm(f => ({ ...f, cpu_cores: parseInt(e.target.value) || 2 }))} />
              </div>
              <div className="grid gap-2">
                <Label>内存 (GB)</Label>
                <Input type="number" value={form.memory_gb} onChange={e => setForm(f => ({ ...f, memory_gb: parseInt(e.target.value) || 4 }))} />
              </div>
              <div className="grid gap-2">
                <Label>磁盘 (GB)</Label>
                <Input type="number" value={form.disk_gb} onChange={e => setForm(f => ({ ...f, disk_gb: parseInt(e.target.value) || 20 }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>镜像地址 (可选)</Label>
              <Input placeholder="默认使用系统镜像" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" /> 删除实例</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除实例 <strong>{deleteTarget?.name}</strong> 吗？删除后将回收所有资源，<strong>此操作不可恢复！</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
