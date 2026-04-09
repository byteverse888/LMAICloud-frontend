'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  RefreshCw, Plus, Search, MoreHorizontal,
  Power, PowerOff, RotateCw, Trash2, Loader2, Bot,
  Cpu, HardDrive, Globe, Server, CreditCard, Clock, Cloud, Radio,
  FileText, Terminal, XCircle, AlertTriangle,
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { useOpenClawInstances } from '@/hooks/use-openclaw'
import { useAuthStore } from '@/stores/auth-store'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const WebTerminal = dynamic(
  () => import('@/components/terminal/web-terminal'),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> }
)

const getStatusBadge = (status: string) => {
  const cfg: Record<string, { label: string; variant: any; dot: string }> = {
    running: { label: '运行中', variant: 'success', dot: 'bg-emerald-500' },
    stopped: { label: '已停止', variant: 'secondary', dot: 'bg-gray-400' },
    creating: { label: '创建中', variant: 'outline', dot: 'bg-blue-500' },
    error: { label: '异常', variant: 'destructive', dot: 'bg-red-500' },
    releasing: { label: '删除中', variant: 'warning', dot: 'bg-amber-500' },
    released: { label: '已删除', variant: 'secondary', dot: 'bg-gray-400' },
    expired: { label: '已过期', variant: 'warning', dot: 'bg-orange-500' },
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

const getBillingBadge = (billingType?: string) => {
  const cfg: Record<string, { label: string; variant: any }> = {
    hourly: { label: '按量', variant: 'outline' },
    monthly: { label: '包月', variant: 'secondary' },
    yearly: { label: '包年', variant: 'default' },
  }
  const c = cfg[billingType || 'hourly'] || cfg.hourly
  return <Badge variant={c.variant} className="text-xs gap-1"><CreditCard className="h-3 w-3" />{c.label}</Badge>
}

export default function OpenClawPage() {
  const router = useRouter()
  const { instances, loading, refresh, silentRefresh, startInstance, stopInstance, deleteInstance, forceDeleteInstance } = useOpenClawInstances()
  const { token } = useAuthStore()

  // 轮询：有过渡态实例时每 5s 静默刷新（不触发 loading 动画）
  const hasTransientInstances = instances.some((i: any) =>
    ['creating', 'starting', 'stopping', 'releasing'].includes(i.status)
  )
  useEffect(() => {
    if (!hasTransientInstances) return
    const iv = setInterval(silentRefresh, 5000)
    return () => clearInterval(iv)
  }, [hasTransientInstances, silentRefresh])

  // 搜索 & 筛选
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 强制删除确认
  const [forceDeleteTarget, setForceDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [forceDeleting, setForceDeleting] = useState(false)

  // 日志弹窗
  const [logInstance, setLogInstance] = useState<{ id: string; name: string } | null>(null)
  const [logTail, setLogTail] = useState(100)
  const [instanceLogs, setInstanceLogs] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // WebShell 终端
  const [termInstance, setTermInstance] = useState<{ id: string; name: string } | null>(null)

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

  const handleRestart = async (id: string) => {
    try { await api.post(`/openclaw/instances/${id}/restart`); toast.success('重启中') } catch { toast.error('重启失败') }
  }

  const handleForceDelete = async () => {
    if (!forceDeleteTarget) return
    try {
      setForceDeleting(true)
      await forceDeleteInstance(forceDeleteTarget.id)
      toast.success('实例已强制删除')
      setForceDeleteTarget(null)
    } catch { toast.error('强制删除失败') }
    finally { setForceDeleting(false) }
  }

  // 日志
  const fetchInstanceLogs = useCallback(async (instanceId: string, tail: number) => {
    try {
      setLogsLoading(true)
      const { data } = await api.get<{ logs: string }>(`/openclaw/instances/${instanceId}/logs`, { tail })
      setInstanceLogs(data.logs || '')
    } catch { setInstanceLogs('[Error] 获取日志失败') }
    finally { setLogsLoading(false) }
  }, [])

  const refreshInstanceLogs = () => {
    if (logInstance) fetchInstanceLogs(logInstance.id, logTail)
  }

  useEffect(() => {
    if (logInstance) fetchInstanceLogs(logInstance.id, logTail)
  }, [logInstance, logTail, fetchInstanceLogs])

  useEffect(() => {
    if (logInstance && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [instanceLogs, logInstance])

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> 智能体实例
          </h1>
          <p className="text-muted-foreground text-sm mt-1">管理您的智能体实例</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 刷新
          </Button>
          <Button size="sm" onClick={() => router.push('/openclaw/create')}>
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
                <TableHead className="min-w-[120px]">名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>镜像</TableHead>
                <TableHead>节点</TableHead>
                <TableHead>计费</TableHead>
                <TableHead>配置</TableHead>
                <TableHead>内网 IP</TableHead>
                <TableHead>到期时间</TableHead>
                <TableHead className="text-right w-[60px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : pagedInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Bot className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">暂无智能体实例</p>
                      <Button size="sm" className="mt-1" onClick={() => router.push('/openclaw/create')}>
                        <Plus className="h-4 w-4 mr-1" /> 创建实例
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pagedInstances.map(inst => (
                  <TableRow key={inst.id} className="hover:bg-primary/3 transition-colors">
                    <TableCell>
                      <div>
                        <Link href={`/openclaw/${inst.id}`} className="font-medium hover:text-primary transition-colors">
                          {inst.name}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {inst.created_at ? new Date(inst.created_at).toLocaleString() : '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(inst.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground max-w-[140px] truncate block" title={inst.image_url || ''}>
                        {inst.image_url ? inst.image_url.split('/').pop() : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {(inst as any).node_type === 'edge' ? (
                          <Badge variant="outline" className="gap-1 text-xs border-orange-300 text-orange-600 dark:text-orange-400">
                            <Radio className="h-3 w-3" />边缘
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs border-blue-300 text-blue-600 dark:text-blue-400">
                            <Cloud className="h-3 w-3" />云端
                          </Badge>
                        )}
                        {(inst as any).node_name && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground font-mono max-w-[80px] truncate block">
                                  {(inst as any).node_name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent><p className="font-mono text-xs">{(inst as any).node_name}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getBillingBadge((inst as any).billing_type)}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        <div className="flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground" />{inst.cpu_cores}核 / {inst.memory_gb}GB</div>
                        <div className="flex items-center gap-1"><HardDrive className="h-3 w-3 text-muted-foreground" />{inst.disk_gb}GB</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{inst.internal_ip || '-'}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(inst as any).expired_at
                        ? new Date((inst as any).expired_at).toLocaleDateString()
                        : <span className="text-xs">-</span>}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleRestart(inst.id)} disabled={inst.status !== 'running'}>
                            <RotateCw className="h-4 w-4 mr-2" />重启
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setLogInstance({ id: inst.id, name: inst.name })}>
                            <FileText className="h-4 w-4 mr-2" />查看日志
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTermInstance({ id: inst.id, name: inst.name })} disabled={inst.status !== 'running'}>
                            <Terminal className="h-4 w-4 mr-2" />WebShell
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => setDeleteTarget({ id: inst.id, name: inst.name })} disabled={['releasing', 'released'].includes(inst.status)}>
                            <Trash2 className="h-4 w-4 mr-2" />删除
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => setForceDeleteTarget({ id: inst.id, name: inst.name })} disabled={inst.status === 'released'}>
                            <XCircle className="h-4 w-4 mr-2" />强制删除
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

      {/* 强制删除确认 */}
      <AlertDialog open={!!forceDeleteTarget} onOpenChange={open => { if (!open) setForceDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" /> 强制删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要强制删除实例 <strong>{forceDeleteTarget?.name}</strong> 吗？
              此操作将直接清理 K8s 资源并更新数据库，无论实例当前状态如何。<strong>此操作不可恢复！</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={forceDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceDelete} disabled={forceDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {forceDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认强制删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* WebShell 终端弹窗 */}
      <Dialog open={!!termInstance} onOpenChange={(open) => { if (!open) setTermInstance(null) }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">WebShell 终端</DialogTitle>
          {termInstance && token && (
            <WebTerminal
              instanceId={termInstance.id}
              token={token}
              instanceName={termInstance.name}
              wsPath="/ws/openclaw/terminal"
              onClose={() => setTermInstance(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 日志弹窗 */}
      <Dialog open={!!logInstance} onOpenChange={(open) => { if (!open) setLogInstance(null) }}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>实例日志 - {logInstance?.name}</span>
              <div className="flex items-center gap-2">
                <Select value={String(logTail)} onValueChange={(v) => setLogTail(Number(v))}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 行</SelectItem>
                    <SelectItem value="200">200 行</SelectItem>
                    <SelectItem value="500">500 行</SelectItem>
                    <SelectItem value="1000">1000 行</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={refreshInstanceLogs} disabled={logsLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="bg-black rounded p-3 h-[60vh] overflow-auto font-mono text-xs text-green-400 whitespace-pre-wrap">
            {logsLoading ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>
            ) : (
              <>
                {instanceLogs || '(无日志)'}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
