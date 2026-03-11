'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  RefreshCw, Plus, Search, Filter, MoreHorizontal,
  Power, PowerOff, Trash2, Terminal, Loader2,
  ChevronDown, ChevronUp, List, Activity, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useInstances } from '@/hooks/use-api'

export default function InstancesPage() {
  const t = useTranslations('instances')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'monitor'>('list')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState('current')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { instances, loading, refresh, startInstance, stopInstance, deleteInstance } = useInstances()

  // 过滤逻辑
  const filteredInstances = useMemo(() => {
    let list = instances
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(i => i.name?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q))
    }
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter)
    }
    return list
  }, [instances, searchQuery, statusFilter])

  // 全选
  const allSelected = filteredInstances.length > 0 && selectedIds.length === filteredInstances.length
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filteredInstances.map(i => i.id))
  }
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // 批量释放
  const handleBatchRelease = async () => {
    for (const id of selectedIds) {
      await deleteInstance(id)
    }
    setSelectedIds([])
  }

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; variant: any; dot: string }> = {
      running: { label: '运行中', variant: 'success', dot: 'bg-emerald-500' },
      stopped: { label: '已停止', variant: 'secondary', dot: 'bg-gray-400' },
      creating: { label: '创建中', variant: 'outline', dot: 'bg-blue-500' },
      starting: { label: '启动中', variant: 'outline', dot: 'bg-blue-500' },
      stopping: { label: '停止中', variant: 'warning', dot: 'bg-amber-500' },
      releasing: { label: '释放中', variant: 'warning', dot: 'bg-amber-500' },
      released: { label: '已释放', variant: 'secondary', dot: 'bg-gray-400' },
      error: { label: '异常', variant: 'destructive', dot: 'bg-red-500' },
    }
    const c = cfg[status] || { label: status, variant: 'secondary', dot: 'bg-gray-400' }
    return (
      <Badge variant={c.variant} className="gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
        {c.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 标题区 */}
      <div>
        <h1 className="text-2xl font-bold">容器实例</h1>
        <p className="text-sm text-muted-foreground mt-1">
          容器实例提供 1卡、2卡、4卡、8卡的实例。多个实例之间内网互通。可按需和包年包月购买，按需实例关机不计费，开机自动重建。
          连续关机 15 天会自动释放实例。
          <span className="text-red-500 ml-1">欠费的实例会关机并释放系统盘，10天后释放实例。</span>
        </p>
        <div className="flex items-center gap-1 mt-1 text-sm text-primary cursor-pointer">
          <List className="h-4 w-4" /> 使用指南
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Link href="/instances/create/config">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              创建容器实例
            </Button>
          </Link>
          <Button variant="outline" disabled={selectedIds.length === 0} onClick={handleBatchRelease}>
            <Trash2 className="h-4 w-4 mr-1" />
            释放实例
          </Button>
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
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={refresh}>
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
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">用户</span>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">当前用户</SelectItem>
                <SelectItem value="all">所有用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">创建时间</span>
            <Input type="date" className="w-36 h-8" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="开始日期与时间" />
            <span className="text-muted-foreground">~</span>
            <Input type="date" className="w-36 h-8" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="结束日期与时间" />
            <Button variant="ghost" size="icon" className="h-8 w-8"><Calendar className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">状态</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="running">运行中</SelectItem>
                <SelectItem value="stopped">已停止</SelectItem>
                <SelectItem value="creating">创建中</SelectItem>
                <SelectItem value="error">异常</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 表格 */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
            </TableHead>
            <TableHead>
              实例名称 / ID
            </TableHead>
            <TableHead>
              状态
              <Filter className="inline h-3 w-3 ml-1 text-muted-foreground" />
            </TableHead>
            <TableHead>计算配置</TableHead>
            <TableHead>磁盘配置</TableHead>
            <TableHead>存储与数据</TableHead>
            <TableHead>内网 IP</TableHead>
            <TableHead>网络描述</TableHead>
            <TableHead>远程访问</TableHead>
            <TableHead>快捷开发</TableHead>
            <TableHead>更多访问</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={12} className="h-32 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : filteredInstances.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            filteredInstances.map(inst => (
              <TableRow key={inst.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(inst.id)}
                    onCheckedChange={() => toggleSelect(inst.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <Link href={`/instances/${inst.id}`} className="font-medium hover:text-primary transition-colors">
                      {inst.name}
                    </Link>
                    <div className="text-xs text-muted-foreground font-mono">{inst.id}</div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(inst.status)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {inst.gpu_model && inst.gpu_count > 0 ? (
                      <div>{inst.gpu_model} x {inst.gpu_count}</div>
                    ) : (
                      <div>CPU {inst.cpu_cores}核</div>
                    )}
                    <div className="text-xs text-muted-foreground">{inst.cpu_cores}核 / {inst.memory}GB</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{inst.disk || '-'} GB</div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">-</span>
                </TableCell>
                <TableCell>
                  <code className="text-xs">{inst.internal_ip || '-'}</code>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {inst.node_type === 'edge' ? '边缘节点' : '内网互通'}
                  </span>
                </TableCell>
                <TableCell>
                  {inst.ssh_host && inst.ssh_port ? (
                    <code className="text-xs bg-muted/70 px-1.5 py-0.5 rounded">
                      {inst.ssh_host}:{inst.ssh_port}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Link href={`/instances/${inst.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Web Terminal">
                      <Terminal className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-xs">-</span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startInstance(inst.id)} disabled={inst.status === 'running' || inst.status === 'starting'}>
                        <Power className="h-4 w-4 mr-2" />开机
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => stopInstance(inst.id)} disabled={inst.status !== 'running'}>
                        <PowerOff className="h-4 w-4 mr-2" />关机
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteInstance(inst.id)} disabled={inst.status === 'releasing' || inst.status === 'released'}>
                        <Trash2 className="h-4 w-4 mr-2" />释放
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
  )
}
