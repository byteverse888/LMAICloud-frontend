'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  RefreshCw, Search, Bot, Loader2,
  Server, Globe, Cpu, HardDrive,
  CheckCircle, XCircle, AlertTriangle, PauseCircle, Terminal,
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
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { useAdminOpenClawInstances } from '@/hooks/use-openclaw'
import { useAuthStore } from '@/stores/auth-store'

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
  const [termInstance, setTermInstance] = useState<{ id: string; name: string } | null>(null)

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

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> OpenClaw 实例管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">管理所有用户的 AI Agent 实例</p>
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
                <TableHead>命名空间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>节点类型</TableHead>
                <TableHead>配置</TableHead>
                <TableHead>端口</TableHead>
                <TableHead>内网 IP</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
                </TableRow>
              ) : pagedInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>暂无 OpenClaw 实例</p>
                  </TableCell>
                </TableRow>
              ) : pagedInstances.map(inst => (
                <TableRow key={inst.id} className="hover:bg-primary/3">
                  <TableCell>
                    <Link href={`/openclaw/${inst.id}`} className="font-medium hover:text-primary transition-colors">{inst.name}</Link>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{inst.id.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell><code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{inst.namespace || '-'}</code></TableCell>
                  <TableCell>{getStatusBadge(inst.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {inst.node_type === 'edge' ? <Globe className="h-3 w-3" /> : <Server className="h-3 w-3" />}
                      {inst.node_type === 'edge' ? '边缘' : '云端'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{inst.cpu_cores}核/{inst.memory_gb}GB</span>
                      <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{inst.disk_gb}GB</span>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs">{inst.port}</code></TableCell>
                  <TableCell><code className="text-xs font-mono">{inst.internal_ip || '-'}</code></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inst.created_at ? new Date(inst.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={inst.status !== 'running'}
                      onClick={() => setTermInstance({ id: inst.id, name: inst.name })}
                      title="登录终端"
                    >
                      <Terminal className="h-4 w-4" />
                    </Button>
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

      {/* WebShell 终端弹窗 */}
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
    </div>
  )
}
