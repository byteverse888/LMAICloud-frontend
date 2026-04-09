'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  RefreshCw, Search, Bot, Loader2,
  Server, Globe, Cpu, HardDrive,
  CheckCircle, XCircle, AlertTriangle, PauseCircle, Terminal, User,
  Eye, FileText, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { useAdminOpenClawInstances } from '@/hooks/use-openclaw'
import { useAuthStore } from '@/stores/auth-store'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const WebTerminal = dynamic(
  () => import('@/components/terminal/web-terminal'),
  { ssr: false }
)

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

export default function AdminOpenClawPage() {
  const { instances, loading, refresh } = useAdminOpenClawInstances()
  const { token } = useAuthStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 终端
  const [termInstance, setTermInstance] = useState<{ id: string; name: string } | null>(null)

  // 详情
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 日志
  const [logsOpen, setLogsOpen] = useState(false)
  const [logsInstance, setLogsInstance] = useState<{ id: string; name: string } | null>(null)
  const [logs, setLogs] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)
  const [logTail, setLogTail] = useState(200)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredInstances = useMemo(() => {
    let list = instances
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.id.includes(q) || (i.namespace || '').includes(q))
    }
    if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter)
    }
    return list
  }, [instances, searchQuery, statusFilter])

  const pagedInstances = paginateArray(filteredInstances, currentPage, pageSize)

  // 统计
  const stats = useMemo(() => ({
    total: instances.length,
    running: instances.filter(i => i.status === 'running').length,
    stopped: instances.filter(i => i.status === 'stopped').length,
    error: instances.filter(i => i.status === 'error').length,
  }), [instances])

  // ── 详情 ──
  const showDetail = async (id: string) => {
    try {
      setDetailLoading(true)
      setDetailOpen(true)
      const { data } = await api.get<any>(`/admin/openclaw/instances/${id}`)
      setDetailData(data)
    } catch { toast.error('获取详情失败') }
    finally { setDetailLoading(false) }
  }

  // ── 日志 ──
  const showLogs = async (id: string, name: string) => {
    setLogsInstance({ id, name })
    setLogsOpen(true)
    try {
      setLogsLoading(true)
      const { data } = await api.get<{ logs: string }>(`/admin/openclaw/instances/${id}/logs`, { tail: logTail })
      setLogs(data.logs || '')
    } catch { setLogs('[Error] 获取日志失败') }
    finally { setLogsLoading(false) }
  }

  const refreshLogs = async () => {
    if (!logsInstance) return
    try {
      setLogsLoading(true)
      const { data } = await api.get<{ logs: string }>(`/admin/openclaw/instances/${logsInstance.id}/logs`, { tail: logTail })
      setLogs(data.logs || '')
    } catch { setLogs('[Error] 获取日志失败') }
    finally { setLogsLoading(false) }
  }

  useEffect(() => {
    if (logsOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, logsOpen])

  // ── 删除 ──
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/openclaw/instances/${deleteTarget.id}`)
      toast.success('实例已删除')
      setDeleteTarget(null)
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> 智能体实例管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">管理所有用户的智能体实例</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Server className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">总实例数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-2xl font-bold text-emerald-600">{stats.running}</p>
            <p className="text-xs text-muted-foreground">运行中</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <PauseCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-2xl font-bold text-gray-500">{stats.stopped}</p>
            <p className="text-xs text-muted-foreground">已停止</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.error}</p>
            <p className="text-xs text-muted-foreground">异常</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索筛选 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索名称、ID、命名空间..." className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="running">运行中</SelectItem>
            <SelectItem value="stopped">已停止</SelectItem>
            <SelectItem value="creating">创建中</SelectItem>
            <SelectItem value="error">异常</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 表格 */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">名称</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>节点 / IP</TableHead>
                <TableHead>配置</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
                </TableRow>
              ) : pagedInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>暂无智能体实例</p>
                  </TableCell>
                </TableRow>
              ) : pagedInstances.map(inst => (
                <TableRow key={inst.id} className="hover:bg-primary/3">
                  <TableCell>
                    <Link href={`/openclaw/${inst.id}`} className="font-medium hover:text-primary transition-colors">{inst.name}</Link>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{inst.id.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="max-w-[100px] truncate" title={(inst as any).user_email || '-'}>{(inst as any).user_email || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{inst.namespace || '-'}</code></TableCell>
                  <TableCell>{getStatusBadge(inst.status)}</TableCell>
                  {/* 合并后的 节点/IP 列 */}
                  <TableCell className="text-xs max-w-[160px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="gap-1 whitespace-nowrap text-xs px-1.5 py-0">
                          {inst.node_type === 'edge' ? <Globe className="h-3 w-3" /> : <Server className="h-3 w-3" />}
                          {inst.node_type === 'edge' ? '边缘' : '云端'}
                        </Badge>
                      </div>
                      {(inst.node_name || (inst as any).pod_node) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate font-medium cursor-default">
                                {(inst as any).pod_node || inst.node_name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>节点: {(inst as any).pod_node || inst.node_name}</p>
                              {(inst as any).pod_ip && <p>Pod IP: {(inst as any).pod_ip}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {(inst as any).pod_ip && (
                        <code className="text-muted-foreground font-mono">{(inst as any).pod_ip}</code>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{inst.cpu_cores}核/{inst.memory_gb}GB</span>
                      <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{inst.disk_gb}GB</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{inst.created_at ? new Date(inst.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => showDetail(inst.id)} title="详情">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => showLogs(inst.id, inst.name)} title="日志">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        disabled={inst.status !== 'running'}
                        onClick={() => setTermInstance({ id: inst.id, name: inst.name })}
                        title="登录终端"
                      >
                        <Terminal className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                        disabled={inst.status === 'releasing' || inst.status === 'released'}
                        onClick={() => setDeleteTarget({ id: inst.id, name: inst.name })}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={filteredInstances.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />

      {/* ── 详情弹窗 ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>智能体实例详情</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : detailData && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称:</span> <strong>{detailData.name}</strong></div>
                <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{detailData.id}</code></div>
                <div><span className="text-muted-foreground">用户:</span> {detailData.user_email || '-'}</div>
                <div><span className="text-muted-foreground">命名空间:</span> <code>{detailData.namespace || '-'}</code></div>
                <div><span className="text-muted-foreground">状态:</span> {getStatusBadge(detailData.status)}</div>
                <div><span className="text-muted-foreground">节点类型:</span> {detailData.node_type === 'edge' ? '边缘' : '云端'}</div>
                <div><span className="text-muted-foreground">节点:</span> {detailData.pod_node || detailData.node_name || '-'}</div>
                <div><span className="text-muted-foreground">Pod IP:</span> <code>{detailData.pod_ip || '-'}</code></div>
                <div><span className="text-muted-foreground">Host IP:</span> <code>{detailData.host_ip || '-'}</code></div>
                <div><span className="text-muted-foreground">Pod 状态:</span> {detailData.pod_status || '-'}</div>
                <div><span className="text-muted-foreground">重启次数:</span> {detailData.restart_count ?? 0}</div>
                <div><span className="text-muted-foreground">配置:</span> {detailData.cpu_cores}核 / {detailData.memory_gb}GB / {detailData.disk_gb}GB</div>
                <div><span className="text-muted-foreground">镜像:</span> <code className="text-xs break-all">{detailData.image_url || '-'}</code></div>
                <div><span className="text-muted-foreground">创建时间:</span> {detailData.created_at ? new Date(detailData.created_at).toLocaleString() : '-'}</div>
              </div>

              {/* 容器状态 */}
              {detailData.container_statuses?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">容器状态</h4>
                  <div className="space-y-2">
                    {detailData.container_statuses.map((cs: any) => (
                      <div key={cs.name} className="bg-muted/50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cs.name}</span>
                          <Badge variant={cs.ready ? 'default' : 'destructive'} className="text-xs">
                            {cs.state}{cs.reason ? ` (${cs.reason})` : ''}
                          </Badge>
                          <span className="text-xs text-muted-foreground">重启: {cs.restart_count}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">{cs.image}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 事件 */}
              {detailData.events?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">事件</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detailData.events.map((e: any, i: number) => (
                      <div key={i} className="text-xs flex gap-2">
                        <Badge variant={e.type === 'Warning' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                          {e.type}
                        </Badge>
                        <span className="text-muted-foreground">{e.reason}:</span>
                        <span className="truncate">{e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 日志弹窗 ── */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>实例日志 - {logsInstance?.name}</span>
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
                <Button variant="outline" size="sm" onClick={refreshLogs} disabled={logsLoading}>
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
                {logs || '(无日志)'}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── WebShell 终端弹窗 ── */}
      <Dialog open={!!termInstance} onOpenChange={(open) => { if (!open) setTermInstance(null) }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">OpenClaw 终端</DialogTitle>
          {termInstance && token && (
            <WebTerminal
              instanceId={termInstance.id}
              token={token}
              instanceName={termInstance.name}
              wsPath="/ws/openclaw/admin/terminal"
              onClose={() => setTermInstance(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── 删除确认 ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除智能体实例 <strong>{deleteTarget?.name}</strong> 吗？此操作将释放所有关联的 K8s 资源，不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
