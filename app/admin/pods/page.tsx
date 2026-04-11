'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useAdminPods, useAdminNamespaces } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Search, RefreshCw, Trash2, Loader2, Container, Eye, FileText, Terminal as TerminalIcon, Cpu, MemoryStick } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import toast from 'react-hot-toast'
import '@xterm/xterm/css/xterm.css'

function statusBadge(pod: any) {
  // 优先使用 effective_status（已考虑容器就绪和 Terminating），fallback 到 status（原始 Phase）
  const effectiveStatus = pod.effective_status || pod.status || 'Unknown'
  const phase = pod.status || 'Unknown'

  // Terminating 优先显示
  if (pod.is_terminating || effectiveStatus === 'Terminating') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
        Terminating
      </span>
    )
  }

  const colors: Record<string, string> = {
    Running: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    starting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Succeeded: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    Failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    Unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
  }

  // Running phase 但容器未全就绪：显示 "启动中 x/y"
  if (phase === 'Running' && effectiveStatus === 'starting') {
    const ready = pod.ready_containers ?? 0
    const total = pod.total_containers ?? 0
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.starting}`}>
        启动中 {ready}/{total}
      </span>
    )
  }

  const label: Record<string, string> = {
    Running: 'Running',
    Pending: 'Pending',
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    Unknown: 'Unknown',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[phase] || colors.Unknown}`}>
      {label[phase] || phase}
    </span>
  )
}

export default function PodsPage() {
  // 格式化 CPU (毫核 → 核)
  const fmtCpu = (mc: number | null | undefined) => {
    if (mc == null) return '-'
    if (mc < 1000) return `${mc}m`
    return `${(mc / 1000).toFixed(1)} 核`
  }
  // 格式化内存 (bytes → MB/GB)
  const fmtMem = (bytes: number | null | undefined) => {
    if (bytes == null) return '-'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ki`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} Mi`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Gi`
  }
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [nodeFilter, setNodeFilter] = useState<string>('__all__')
  const [statusFilter, setStatusFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const { pods, loading, total, refresh } = useAdminPods(
    nsFilter === '__all__' ? undefined : nsFilter,
    nodeFilter === '__all__' ? undefined : nodeFilter,
    statusFilter === '__all__' ? undefined : statusFilter,
    search || undefined,
  )
  const pagedPods = paginateArray(pods, currentPage, pageSize)
  // 从全量 Pod 中提取唯一节点列表（用于筛选下拉框）
  const nodeNames = Array.from(new Set(pods.map((p: any) => p.node_name).filter(Boolean))).sort() as string[]

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 批量操作
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)

  // 仅当前页多选（不跨页，切换页面/筛选自动清空）
  const pageKeys = pagedPods.map((p: any) => `${p.namespace}/${p.name}`)
  const allPageSelected = pageKeys.length > 0 && pageKeys.every(k => selectedKeys.includes(k))
  const toggleSelectAll = () => {
    setSelectedKeys(allPageSelected ? [] : pageKeys)
  }
  const toggleSelect = (key: string) => {
    setSelectedKeys(selectedKeys.includes(key) ? selectedKeys.filter(k => k !== key) : [...selectedKeys, key])
  }
  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    let ok = 0, fail = 0
    for (const key of selectedKeys) {
      const [ns, ...rest] = key.split('/')
      const name = rest.join('/')
      try {
        await api.delete(`/admin/pods/${ns}/${name}`)
        ok++
      } catch { fail++ }
    }
    setBatchDeleting(false)
    setBatchDeleteConfirm(false)
    setSelectedKeys([])
    if (fail === 0) toast.success(`已批量删除 ${ok} 个 Pod`)
    else toast.error(`删除完成：${ok} 成功，${fail} 失败`)
    refresh()
  }

  // 详情
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailPod, setDetailPod] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 日志
  const [logsOpen, setLogsOpen] = useState(false)
  const [logsPod, setLogsPod] = useState<{ ns: string; name: string } | null>(null)
  const [logs, setLogs] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)
  const [logTail, setLogTail] = useState(200)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 终端
  const [termOpen, setTermOpen] = useState(false)
  const [termPod, setTermPod] = useState<{ ns: string; name: string; instanceName: string } | null>(null)

  const handleSearch = () => { setSearch(searchInput); setCurrentPage(1); setSelectedKeys([]) }
  const handleNsChange = (v: string) => { setNsFilter(v); setCurrentPage(1); setSelectedKeys([]) }
  const handleNodeChange = (v: string) => { setNodeFilter(v); setCurrentPage(1); setSelectedKeys([]) }
  const handleStatusChange = (v: string) => { setStatusFilter(v); setCurrentPage(1); setSelectedKeys([]) }
  const handlePageSizeChange = (s: number) => { setPageSize(s); setCurrentPage(1); setSelectedKeys([]) }
  const handlePageChange = (p: number) => { setCurrentPage(p); setSelectedKeys([]) }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/pods/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功')
      setDeleteTarget(null)
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  const showDetail = async (ns: string, name: string) => {
    try {
      setDetailLoading(true)
      setDetailOpen(true)
      const { data } = await api.get<any>(`/admin/pods/${ns}/${name}`)
      setDetailPod(data)
    } catch { toast.error('获取详情失败') }
    finally { setDetailLoading(false) }
  }

  const showLogs = async (ns: string, name: string) => {
    setLogsPod({ ns, name })
    setLogsOpen(true)
    try {
      setLogsLoading(true)
      const { data } = await api.get<{ logs: string }>(`/admin/pods/${ns}/${name}/logs`, { tail: logTail })
      setLogs(data.logs || '')
    } catch { setLogs('[Error] 获取日志失败') }
    finally { setLogsLoading(false) }
  }

  const refreshLogs = async () => {
    if (!logsPod) return
    try {
      setLogsLoading(true)
      const { data } = await api.get<{ logs: string }>(`/admin/pods/${logsPod.ns}/${logsPod.name}/logs`, { tail: logTail })
      setLogs(data.logs || '')
    } catch { setLogs('[Error] 获取日志失败') }
    finally { setLogsLoading(false) }
  }

  useEffect(() => {
    if (logsOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, logsOpen])

  const openTerminal = (ns: string, name: string, instanceName: string) => {
    setTermPod({ ns, name, instanceName })
    setTermOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">容器管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理 Kubernetes Pod 资源</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" /> 刷新
        </Button>
      </div>

      {/* 过滤栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Select value={nsFilter} onValueChange={handleNsChange}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="全部命名空间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部命名空间</SelectItem>
                {namespaces.map((ns) => (
                  <SelectItem key={ns.name} value={ns.name}>{ns.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部状态</SelectItem>
                <SelectItem value="Running">Running</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Terminating">Terminating</SelectItem>
                <SelectItem value="Succeeded">Succeeded</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={nodeFilter} onValueChange={handleNodeChange}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="全部节点" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部节点</SelectItem>
                {nodeNames.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="搜索 Pod 名称..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5" /> Pods
            <Badge variant="secondary" className="ml-2">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 批量操作工具栏 */}
          {selectedKeys.length > 0 && (
            <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">已选 <strong>{selectedKeys.length}</strong> 个 Pod</span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setBatchDeleteConfirm(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> 批量删除
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}>取消选择</Button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : pods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无 Pod</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected ? true : selectedKeys.length > 0 ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>Pod</TableHead>
                  <TableHead>命名空间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>CPU / 内存</TableHead>
                  <TableHead>节点 / IP</TableHead>
                  <TableHead>重启</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPods.map((pod: any) => (
                  <TableRow key={`${pod.namespace}/${pod.name}`} className="group" data-state={selectedKeys.includes(`${pod.namespace}/${pod.name}`) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedKeys.includes(`${pod.namespace}/${pod.name}`)}
                        onCheckedChange={() => toggleSelect(`${pod.namespace}/${pod.name}`)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px]">
                      {pod.instance_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {pod.instance_id ? (
                                <Link href={`/instances/${pod.instance_id}`} className="block truncate text-primary hover:underline" target="_blank">
                                  {pod.instance_name}
                                </Link>
                              ) : (
                                <span className="block truncate text-primary">{pod.instance_name}</span>
                              )}
                            </TooltipTrigger>
                            <TooltipContent><p>{pod.instance_name}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[120px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate font-mono text-xs">{pod.name}</span>
                          </TooltipTrigger>
                          <TooltipContent><p>{pod.name}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{pod.namespace}</Badge></TableCell>
                    <TableCell>{statusBadge(pod)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      <div>{fmtCpu(pod.cpu_usage_millicores)}</div>
                      <div className="text-muted-foreground">{fmtMem(pod.memory_usage_bytes)}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px]">
                      {pod.node_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-0.5">
                                <span className="block truncate font-medium">{pod.node_name}</span>
                                <span className="block truncate text-muted-foreground font-mono">{pod.pod_ip || '-'}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>节点: {pod.node_name}</p>
                              {pod.host_ip && <p>Host IP: {pod.host_ip}</p>}
                              <p>Pod IP: {pod.pod_ip || '-'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={pod.restart_count > 0 ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}>
                        {pod.restart_count || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {pod.created_at ? new Date(pod.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => showDetail(pod.namespace, pod.name)} title="详情">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => showLogs(pod.namespace, pod.name)} title="日志">
                          <FileText className="h-4 w-4" />
                        </Button>
                        {pod.status === 'Running' && (
                          <Button variant="ghost" size="sm" onClick={() => openTerminal(pod.namespace, pod.name, pod.instance_name || pod.name)} title="终端">
                            <TerminalIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget({ ns: pod.namespace, name: pod.name })}
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
          )}
          <Pagination
            page={currentPage} pageSize={pageSize} total={total}
            onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      {/* Pod 详情 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pod 详情</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : detailPod && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称:</span> <strong>{detailPod.name}</strong></div>
                <div><span className="text-muted-foreground">命名空间:</span> {detailPod.namespace}</div>
                <div><span className="text-muted-foreground">状态:</span> {statusBadge(detailPod)}</div>
                <div><span className="text-muted-foreground">节点:</span> {detailPod.node_name || '-'}</div>
                <div><span className="text-muted-foreground">Pod IP:</span> <code>{detailPod.pod_ip || '-'}</code></div>
                <div><span className="text-muted-foreground">Host IP:</span> <code>{detailPod.host_ip || '-'}</code></div>
                <div><span className="text-muted-foreground">重启次数:</span> {detailPod.restart_count || 0}</div>
              </div>

              {/* 容器状态 */}
              {detailPod.container_statuses?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">容器状态</h4>
                  <div className="space-y-2">
                    {detailPod.container_statuses.map((cs: any) => (
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
              {detailPod.events?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">事件</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detailPod.events.map((e: any, i: number) => (
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

              {/* Labels */}
              <div>
                <span className="text-muted-foreground">Labels:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(detailPod.labels || {}).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-xs">{k}={String(v)}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 日志对话框 */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Pod 日志 - {logsPod?.ns}/{logsPod?.name}</span>
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

      {/* 终端对话框 */}
      <Dialog open={termOpen} onOpenChange={setTermOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] p-0 [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">Pod 终端</DialogTitle>
          {termPod && termOpen && (
            <PodTerminal ns={termPod.ns} name={termPod.name} instanceName={termPod.instanceName} onClose={() => setTermOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 Pod <strong>{deleteTarget?.ns}/{deleteTarget?.name}</strong> 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteConfirm} onOpenChange={setBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量删除确认</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 <strong>{selectedKeys.length}</strong> 个 Pod 吗？K8s 会根据 Deployment 自动重建。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} disabled={batchDeleting} className="bg-red-600 hover:bg-red-700">
              {batchDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认批量删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ====== 内嵌 Pod 终端组件 ======
function PodTerminal({ ns, name, instanceName, onClose }: { ns: string; name: string; instanceName: string; onClose: () => void }) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<any>(null)
  const connectIdRef = useRef(0)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuthStore()

  /**
   * 安全 fit：检查容器最小尺寸 + 验证 proposeDimensions 结果
   * 防止 Dialog 动画期间、容器折叠时 fit 到 0 行/列导致内容消失
   */
  const safeFit = useCallback(() => {
    const el = terminalRef.current
    const addon = fitAddonRef.current
    const term = termRef.current
    if (!addon || !el || !term) return
    if (el.clientWidth < 100 || el.clientHeight < 50) return
    try {
      const dims = addon.proposeDimensions()
      if (!dims || dims.cols < 2 || dims.rows < 2) return
      addon.fit()
    } catch { /* renderer not ready */ }
  }, [])

  const connect = useCallback(async () => {
    const myId = ++connectIdRef.current
    if (!terminalRef.current) return

    if (terminalRef.current.offsetWidth === 0 || terminalRef.current.offsetHeight === 0) {
      const retryTimer = setTimeout(() => {
        if (connectIdRef.current === myId) connect()
      }, 60)
      ;(terminalRef.current as any).__retryTimer = retryTimer
      return
    }

    const { Terminal } = await import('@xterm/xterm')
    const { FitAddon } = await import('@xterm/addon-fit')

    if (connectIdRef.current !== myId) return

    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    if (termRef.current) { termRef.current.dispose(); termRef.current = null }

    const term = new Terminal({
      cursorBlink: true, cursorStyle: 'block', fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#aeafad',
        black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
        blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
      },
      scrollback: 10000,
      allowProposedApi: true,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    const startTerminal = () => {
      if (connectIdRef.current !== myId || !mountedRef.current) return
      try { fitAddon.proposeDimensions() } catch {
        setTimeout(startTerminal, 30)
        return
      }

      safeFit()
      term.writeln('\x1b[33m正在连接终端...\x1b[0m')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const wsBase = apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
      const wsUrl = `${wsBase}/api/v1/admin/pods/ws/${ns}/${name}/exec?token=${token}`
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket

      socket.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setError(null)
        term.writeln('\x1b[32m终端已连接\x1b[0m')
        term.writeln('')
        try {
          socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
        } catch { /* ignore */ }
      }
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'output') term.write(msg.data)
          else if (msg.type === 'error') term.writeln(`\x1b[31m错误: ${msg.data}\x1b[0m`)
          else if (msg.type === 'info') term.writeln(`\x1b[33m${msg.data}\x1b[0m`)
          else if (msg.type === 'connected') { term.writeln(`\x1b[32m${msg.data}\x1b[0m`); term.writeln('') }
        } catch { term.write(event.data) }
      }
      socket.onclose = (event) => {
        if (!mountedRef.current) return
        setConnected(false)
        term.writeln('')
        term.writeln(`\x1b[33m连接已关闭 (code: ${event.code})\x1b[0m`)
        if (event.code === 1000 && onClose) {
          setTimeout(() => onClose(), 800)
        }
      }
      socket.onerror = () => {
        if (!mountedRef.current) return
        setError('连接错误')
        term.writeln('\x1b[31m连接错误，请检查网络\x1b[0m')
      }

      term.onData((data: string) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'input', data }))
        }
      })
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'resize', cols, rows }))
        }
      })
    }

    setTimeout(startTerminal, 30)
  }, [ns, name, token, safeFit])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      connectIdRef.current++
      if (terminalRef.current) clearTimeout((terminalRef.current as any).__retryTimer)
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      if (termRef.current) { termRef.current.dispose(); termRef.current = null }
    }
  }, [connect])

  // ResizeObserver：检测容器尺寸变化，带防抖
  useEffect(() => {
    const el = terminalRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(() => safeFit(), 150)
    })
    ro.observe(el)
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      ro.disconnect()
    }
  }, [safeFit])

  // 窗口 resize
  useEffect(() => {
    const handleResize = () => safeFit()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [safeFit])

  return (
    <div className="flex flex-col bg-[#1e1e1e] rounded-lg overflow-hidden h-[60vh]">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-[#404040]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-gray-200">{instanceName}</span>
          <span className="text-xs text-gray-500 font-mono">{ns}/{name}</span>
          {error && <span className="text-sm text-red-400 ml-2">{error}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => connect()} className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#404040]" title="重新连接">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#404040]" title="关闭">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      </div>
      {/* 终端区域 */}
      <div ref={terminalRef} className="flex-1 min-h-0 p-2" />
    </div>
  )
}
