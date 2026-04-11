'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import {
  RefreshCw, Plus, Search, Filter, MoreHorizontal,
  Power, PowerOff, Trash2, Terminal, Loader2,
  ChevronDown, ChevronUp, List, Activity, Calendar,
  FileText, XCircle, AlertTriangle, Server, BookOpen, RotateCcw,
  Play, Square, Cpu, HardDrive, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useInstances, useWebSocketStatus } from '@/hooks/use-api'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import toast from 'react-hot-toast'

// 动态加载终端和日志组件（避免SSR问题）
const WebTerminal = dynamic(
  () => import('@/components/terminal/web-terminal'),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> }
)

export default function InstancesPage() {
  const t = useTranslations('instances')
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'monitor'>('list')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState('current')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { instances, loading, refresh, silentRefresh, startInstance, stopInstance, deleteInstance, forceDeleteInstance } = useInstances()
  const { token } = useAuthStore()

  // WebSocket: 实例状态变更时静默刷新（不显示 loading，仅状态真正变化时触发）
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const instancesRef = useRef(instances)
  instancesRef.current = instances
  useWebSocketStatus((data) => {
    if (data.type === 'instance_status' && data.instance_id) {
      const local = instancesRef.current.find(i => i.id === data.instance_id)
      if (!local || local.status !== data.status) {
        if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
        refreshDebounceRef.current = setTimeout(silentRefresh, 1000)
      }
    }
  })
  useEffect(() => {
    return () => { if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current) }
  }, [])

  // 轮询 fallback: 有过渡态实例时每 5s 静默刷新（不触发 loading 动画）
  const hasTransientInstances = instances.some(i =>
    ['creating', 'starting', 'stopping', 'releasing'].includes(i.status)
  )
  useEffect(() => {
    if (!hasTransientInstances) return
    const iv = setInterval(silentRefresh, 5000)
    return () => clearInterval(iv)
  }, [hasTransientInstances, silentRefresh])

  // 弹窗状态：日志 / WebShell
  const [logInstance, setLogInstance] = useState<{ id: string; name: string } | null>(null)
  const [termInstance, setTermInstance] = useState<{ id: string; name: string } | null>(null)

  // 日志弹窗状态
  const [logTail, setLogTail] = useState(100)
  const [instanceLogs, setInstanceLogs] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 获取实例日志
  const fetchInstanceLogs = useCallback(async (instanceId: string, tail: number) => {
    try {
      setLogsLoading(true)
      const { data } = await api.get<{ logs: string }>(`/instances/${instanceId}/logs`, { tail })
      setInstanceLogs(data.logs || '')
    } catch { setInstanceLogs('[Error] 获取日志失败') }
    finally { setLogsLoading(false) }
  }, [])

  const refreshInstanceLogs = () => {
    if (logInstance) fetchInstanceLogs(logInstance.id, logTail)
  }

  // 日志弹窗打开时自动加载 + tail 变化时重新加载
  useEffect(() => {
    if (logInstance) fetchInstanceLogs(logInstance.id, logTail)
  }, [logInstance, logTail, fetchInstanceLogs])

  // 日志自动滚动到底部
  useEffect(() => {
    if (logInstance && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [instanceLogs, logInstance])

  // 过滤逻辑（默认隐藏已删除实例，除非筛选器明确选择）
  const filteredInstances = useMemo(() => {
    let list = instances
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(i => i.name?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q))
    }
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter)
    } else {
      // 默认(全部)时隐藏已删除的实例
      list = list.filter(i => i.status !== 'released')
    }
    if (dateFrom) {
      list = list.filter(i => i.created_at && i.created_at >= dateFrom)
    }
    if (dateTo) {
      list = list.filter(i => i.created_at && i.created_at <= dateTo + 'T23:59:59')
    }
    return list
  }, [instances, searchQuery, statusFilter, dateFrom, dateTo])

  // 分页数据
  const pagedInstances = paginateArray(filteredInstances, currentPage, pageSize)

  // 搜索/筛选/翻页变化时重置页码并清空选择
  const handleSearchChange = (v: string) => { setSearchQuery(v); setCurrentPage(1); setSelectedIds([]) }
  const handleStatusFilterChange = (v: string) => { setStatusFilter(v); setCurrentPage(1); setSelectedIds([]) }
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); setSelectedIds([]) }
  const handlePageChange = (p: number) => { setCurrentPage(p); setSelectedIds([]) }

  // 仅当前页多选（不跨页，切换页面/筛选自动清空）
  const pageIds = pagedInstances.map(i => i.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id))
  const toggleSelectAll = () => {
    setSelectedIds(allPageSelected ? [] : pageIds)
  }
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // 批量操作确认弹窗状态
  const [batchAction, setBatchAction] = useState<'stop' | 'start' | 'delete' | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)

  // 强制删除确认
  const [forceDeleteTarget, setForceDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [forceDeleting, setForceDeleting] = useState(false)

  // 普通删除确认
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 单个关机确认
  const [stopTarget, setStopTarget] = useState<{ id: string; name: string } | null>(null)
  const [stopping, setStopping] = useState(false)

  // 修改名字
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return
    try {
      setRenaming(true)
      await api.patch(`/instances/${renameTarget.id}/rename`, { name: renameValue.trim() })
      toast.success('名称已修改')
      setRenameTarget(null)
      silentRefresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '修改失败')
    } finally {
      setRenaming(false)
    }
  }

  // 选中实例中各状态的数量（用于智能提示）
  const selectedInstances = instances.filter(i => selectedIds.includes(i.id))
  const selectedRunning = selectedInstances.filter(i => i.status === 'running').length
  const selectedStopped = selectedInstances.filter(i => ['stopped', 'error'].includes(i.status)).length
  const selectedCanDelete = selectedInstances.filter(i => !['releasing', 'released'].includes(i.status)).length

  const batchActionConfig: Record<string, { title: string; desc: string; action: string; color: string }> = {
    stop: {
      title: '批量关机',
      desc: `确定要关机选中的 ${selectedRunning} 个运行中的实例吗？非运行中的实例将被跳过。`,
      action: '确认关机',
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    start: {
      title: '批量开机',
      desc: `确定要开机选中的 ${selectedStopped} 个已停止的实例吗？非停止状态的实例将被跳过。`,
      action: '确认开机',
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    delete: {
      title: '批量删除',
      desc: `确定要删除选中的 ${selectedCanDelete} 个实例吗？删除后实例将停止运行并回收资源，此操作不可恢复！`,
      action: '确认删除',
      color: 'bg-red-600 hover:bg-red-700 text-white',
    },
  }

  // 执行批量操作
  const executeBatchAction = async () => {
    if (!batchAction) return
    setBatchLoading(true)
    let successCount = 0
    let failCount = 0
    try {
      for (const inst of selectedInstances) {
        try {
          if (batchAction === 'stop' && inst.status === 'running') {
            await stopInstance(inst.id)
            successCount++
          } else if (batchAction === 'start' && ['stopped', 'error'].includes(inst.status)) {
            await startInstance(inst.id)
            successCount++
          } else if (batchAction === 'delete' && !['releasing', 'released'].includes(inst.status)) {
            await deleteInstance(inst.id)
            successCount++
          }
        } catch {
          failCount++
        }
      }
      if (successCount > 0) {
        const actionLabel = { stop: '关机', start: '开机', delete: '删除' }[batchAction]
        toast.success(`成功${actionLabel} ${successCount} 个实例${failCount > 0 ? `，${failCount} 个失败` : ''}`)
      }
      if (failCount > 0 && successCount === 0) {
        toast.error('操作失败')
      }
      setSelectedIds([])
    } finally {
      setBatchLoading(false)
      setBatchAction(null)
    }
  }

  // 强制删除（无论状态）
  const handleForceDelete = async () => {
    if (!forceDeleteTarget) return
    try {
      setForceDeleting(true)
      await forceDeleteInstance(forceDeleteTarget.id)
      toast.success('实例已强制删除')
      setForceDeleteTarget(null)
    } catch {
      toast.error('强制删除失败')
    } finally {
      setForceDeleting(false)
    }
  }

  // 普通删除（带确认弹窗）
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await deleteInstance(deleteTarget.id)
      toast.success('实例删除中')
      setDeleteTarget(null)
    } catch {
      toast.error('删除失败')
    } finally {
      setDeleting(false)
    }
  }

  // 单个关机（带确认弹窗）
  const handleStop = async () => {
    if (!stopTarget) return
    try {
      setStopping(true)
      await stopInstance(stopTarget.id)
      toast.success('实例关机中')
      setStopTarget(null)
    } catch {
      toast.error('关机失败')
    } finally {
      setStopping(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; variant: any; dot: string }> = {
      running: { label: '运行中', variant: 'success', dot: 'bg-emerald-500' },
      stopped: { label: '已停止', variant: 'secondary', dot: 'bg-gray-400' },
      creating: { label: '创建中', variant: 'outline', dot: 'bg-blue-500' },
      starting: { label: '启动中', variant: 'outline', dot: 'bg-blue-500' },
      stopping: { label: '停止中', variant: 'warning', dot: 'bg-amber-500' },
      releasing: { label: '删除中', variant: 'warning', dot: 'bg-amber-500' },
      released: { label: '已删除', variant: 'secondary', dot: 'bg-gray-400' },
      error: { label: '异常', variant: 'destructive', dot: 'bg-red-500' },
    }
    const c = cfg[status] || { label: status, variant: 'secondary', dot: 'bg-gray-400' }
    const isTransient = ['creating', 'starting', 'stopping', 'releasing'].includes(status)
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

  // 格式化 CPU (毫核 → 核)
  const fmtCpu = (mc: number | null | undefined) => {
    if (mc == null) return '-'
    if (mc < 1000) return `${mc}m`
    return `${(mc / 1000).toFixed(1)}`
  }
  // 格式化内存 (bytes → MB/GB)
  const fmtMem = (bytes: number | null | undefined) => {
    if (bytes == null) return '-'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ki`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} Mi`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Gi`
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 标题区 */}
      <Card className="card-clean overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">容器实例</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                容器实例提供 1卡、2卡、4卡、8卡的实例。多个实例之间内网互通。可按需和包年包月购买，按需实例关机不计费，开机自动重建。
                连续关机 15 天会自动删除实例。
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <BookOpen className="h-3.5 w-3.5" /> 使用指南
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 欠费警告 */}
      <div className="flex items-center gap-2.5 text-sm py-2.5 px-4 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>欠费的实例会关机并释放系统盘，10天后删除实例。请及时充值以避免数据丢失。</span>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Link href="/instances/create">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              创建容器实例
            </Button>
          </Link>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 pl-2 border-l">
              <span className="text-sm text-muted-foreground">已选 {selectedIds.length} 项</span>
              <Button variant="outline" size="sm" onClick={() => setBatchAction('start')} disabled={selectedStopped === 0}>
                <Play className="h-3.5 w-3.5 mr-1" />
                开机
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBatchAction('stop')} disabled={selectedRunning === 0}>
                <Square className="h-3.5 w-3.5 mr-1" />
                关机
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBatchAction('delete')} disabled={selectedCanDelete === 0} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                删除
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-muted-foreground">
                取消选择
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="link"
            size="sm"
            className="text-primary"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            高级搜索 {showAdvancedSearch ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-60"
              placeholder="输入名称或 ID 搜索"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" /> 列表
            </Button>
            <Button
              variant={viewMode === 'monitor' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('monitor')}
            >
              <Activity className="h-4 w-4 mr-1" /> 监控
            </Button>
          </div>
        </div>
      </div>

      {/* 高级搜索展开 */}
      {showAdvancedSearch && (
        <Card className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">用户</span>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">当前用户</SelectItem>
                  <SelectItem value="all">所有用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">创建时间</span>
              <Input type="date" className="w-36 h-8" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="开始日期与时间" />
              <span className="text-muted-foreground">~</span>
              <Input type="date" className="w-36 h-8" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="结束日期与时间" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">状态</span>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="running">运行中</SelectItem>
                  <SelectItem value="stopped">已停止</SelectItem>
                  <SelectItem value="creating">创建中</SelectItem>
                  <SelectItem value="error">异常</SelectItem>
                  <SelectItem value="released">已删除</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => { setUserFilter('current'); setDateFrom(''); setDateTo(''); handleStatusFilterChange('all') }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> 重置
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 表格 */}
      <Card className="card-clean overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 sticky left-0 z-20 bg-muted/30">
                <Checkbox
                  checked={allPageSelected ? true : selectedIds.length > 0 ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold sticky left-10 z-20 bg-muted/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">实例名称 / ID</TableHead>
              <TableHead className="font-semibold">
                状态
                <Filter className="inline h-3 w-3 ml-1 text-muted-foreground" />
              </TableHead>
              <TableHead className="font-semibold">配置</TableHead>
              <TableHead className="font-semibold">镜像</TableHead>
              <TableHead className="font-semibold">计费</TableHead>
              <TableHead className="font-semibold">节点</TableHead>
              <TableHead className="font-semibold">内网 IP</TableHead>
              <TableHead className="font-semibold">到期时间</TableHead>
              <TableHead className="font-semibold text-right sticky right-0 z-20 bg-muted/30">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">加载中...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredInstances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <Server className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">暂无容器实例</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">创建您的第一个容器实例，开始 GPU 计算之旅</p>
                    </div>
                    <Link href="/instances/create">
                      <Button size="sm" className="mt-1">
                        <Plus className="h-4 w-4 mr-1" /> 创建容器实例
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pagedInstances.map(inst => (
                <TableRow
                  key={inst.id}
                  className="hover:bg-primary/3 transition-colors group"
                  data-state={selectedIds.includes(inst.id) ? 'selected' : undefined}
                >
                  <TableCell className={`sticky left-0 z-10 transition-colors ${selectedIds.includes(inst.id) ? 'bg-primary/12 dark:bg-primary/25' : 'bg-card group-hover:bg-primary/3'}`}>
                    <Checkbox
                      checked={selectedIds.includes(inst.id)}
                      onCheckedChange={() => toggleSelect(inst.id)}
                    />
                  </TableCell>
                  <TableCell className={`sticky left-10 z-10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${selectedIds.includes(inst.id) ? 'bg-primary/12 dark:bg-primary/25' : 'bg-card group-hover:bg-primary/3'}`}>
                    <div>
                      <Link href={`/instances/${inst.id}`} className="font-medium hover:text-primary transition-colors">
                        {inst.name}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {inst.created_at ? new Date(inst.created_at).toLocaleString() : '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(inst.status)}
                      {inst.ready_replicas != null && inst.replicas != null && (
                        <span className="text-xs text-muted-foreground">{inst.ready_replicas}/{inst.replicas}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-0.5">
                      {inst.gpu_model && inst.gpu_count > 0 && (
                        <div className="font-medium">{inst.gpu_model} x {inst.gpu_count}</div>
                      )}
                      <div className="flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground" />{inst.cpu_cores}核 / {inst.memory}GB</div>
                      <div className="flex items-center gap-1"><HardDrive className="h-3 w-3 text-muted-foreground" />{inst.disk || '-'}GB</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground max-w-[140px] truncate block" title={inst.image_url || ''}>
                      {inst.image_url ? inst.image_url.split('/').pop() : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        inst.billing_type === 'monthly' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        inst.billing_type === 'yearly' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {inst.billing_type === 'monthly' ? '包月' :
                         inst.billing_type === 'yearly' ? '包年' :
                         inst.billing_type === 'daily' ? '按天' : '按量'}
                      </span>
                      <div className="text-xs text-muted-foreground mt-0.5">¥{inst.hourly_price?.toFixed(2)}/小时</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {inst.node_type === 'edge' ? (
                        <Badge variant="outline" className="gap-1 text-xs border-orange-300 text-orange-600 dark:text-orange-400">边缘</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-xs border-blue-300 text-blue-600 dark:text-blue-400">云端</Badge>
                      )}
                      {inst.node_name && (
                        <span className="text-xs text-muted-foreground font-mono max-w-[80px] truncate block" title={inst.node_name}>
                          {inst.node_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{inst.internal_ip || '-'}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inst.expired_at ? new Date(inst.expired_at).toLocaleDateString() : <span className="text-xs">-</span>}
                  </TableCell>

                  <TableCell className={`text-right sticky right-0 z-10 transition-colors ${selectedIds.includes(inst.id) ? 'bg-primary/12 dark:bg-primary/25' : 'bg-card group-hover:bg-primary/3'}`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startInstance(inst.id)} disabled={!['stopped', 'error'].includes(inst.status)}>
                          <Power className="h-4 w-4 mr-2" />开机
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStopTarget({ id: inst.id, name: inst.name })} disabled={inst.status !== 'running'}>
                          <PowerOff className="h-4 w-4 mr-2" />关机
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLogInstance({ id: inst.id, name: inst.name })}>
                          <FileText className="h-4 w-4 mr-2" />查看日志
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTermInstance({ id: inst.id, name: inst.name })} disabled={inst.status !== 'running'}>
                          <Terminal className="h-4 w-4 mr-2" />WebShell
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setRenameTarget({ id: inst.id, name: inst.name }); setRenameValue(inst.name) }}>
                          <Pencil className="h-4 w-4 mr-2" />修改名字
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => setDeleteTarget({ id: inst.id, name: inst.name })} disabled={inst.status === 'releasing' || inst.status === 'released'}>
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
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* WebShell 弹窗 */}
      <Dialog open={!!termInstance} onOpenChange={(open) => { if (!open) setTermInstance(null) }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">WebShell 终端</DialogTitle>
          {termInstance && token && (
            <WebTerminal
              instanceId={termInstance.id}
              token={token}
              instanceName={termInstance.name}
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

      {/* 批量操作确认弹窗 */}
      <AlertDialog open={!!batchAction} onOpenChange={(open) => { if (!open) setBatchAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{batchAction ? batchActionConfig[batchAction].title : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              {batchAction ? batchActionConfig[batchAction].desc : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBatchAction}
              disabled={batchLoading}
              className={batchAction ? batchActionConfig[batchAction].color : ''}
            >
              {batchLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {batchAction ? batchActionConfig[batchAction].action : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 关机确认弹窗 */}
      <AlertDialog open={!!stopTarget} onOpenChange={(open) => { if (!open) setStopTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <PowerOff className="h-5 w-5" /> 关机实例
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要关闭实例 <strong>{stopTarget?.name}</strong> 吗？实例将停止运行，但资源会保留，可以重新开机。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopping}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop} disabled={stopping} className="bg-amber-600 hover:bg-amber-700 text-white">
              {stopping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认关机
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> 删除实例
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除实例 <strong>{deleteTarget?.name}</strong> 吗？
              删除后将停止运行并回收所有资源，<strong>此操作不可恢复！</strong>
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

      {/* 修改名字弹窗 */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>修改实例名称</DialogTitle>
            <DialogDescription>为实例 <strong>{renameTarget?.name}</strong> 设置新名称</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="rename-input" className="mb-2 block">新名称</Label>
            <Input id="rename-input" value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="输入新名称" maxLength={64} onKeyDown={e => { if (e.key === 'Enter') handleRename() }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={renaming}>取消</Button>
            <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
              {renaming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 强制删除确认弹窗 */}
      <AlertDialog open={!!forceDeleteTarget} onOpenChange={(open) => { if (!open) setForceDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> 强制删除
            </AlertDialogTitle>
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
    </div>
  )
}
