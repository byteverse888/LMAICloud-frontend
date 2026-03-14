'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, MoreHorizontal, Edit, Trash2, Power, RefreshCw, Loader2, Server, Cpu, Cloud, HardDrive } from 'lucide-react'
import { useAdminNodes, useDeleteAdminNode } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { toast } from 'react-hot-toast'

export default function NodesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [nodeTypeTab, setNodeTypeTab] = useState<'all' | 'edge' | 'cloud'>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; name: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  const { nodes, loading, total, refresh } = useAdminNodes()
  const { deleteNode, loading: deleteLoading } = useDeleteAdminNode()
  
  // 前端tab值 cloud 对应后端 node_type 值 center
  const nodeTypeMap: Record<string, string> = { all: 'all', edge: 'edge', cloud: 'center' }
  
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          node.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter
    const matchesType = nodeTypeTab === 'all' || node.node_type === nodeTypeMap[nodeTypeTab]
    return matchesSearch && matchesStatus && matchesType
  })
  const pagedNodes = paginateArray(filteredNodes, currentPage, pageSize)

  // 筛选条件变化时重置页码
  const handleSearchChange = (v: string) => { setSearchQuery(v); setCurrentPage(1) }
  const handleStatusChange = (v: string) => { setStatusFilter(v); setCurrentPage(1) }
  const handleTypeChange = (v: string) => { setNodeTypeTab(v as 'all' | 'edge' | 'cloud'); setCurrentPage(1) }
  const handlePageSizeChange = (s: number) => { setPageSize(s); setCurrentPage(1) }

  // 统计边缘/云端节点数量
  const edgeCount = nodes.filter(n => n.node_type === 'edge').length
  const cloudCount = nodes.filter(n => n.node_type === 'center').length
  
  const handleDeleteClick = (node: { id: string; name: string }) => {
    setNodeToDelete(node)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteConfirm = async () => {
    if (!nodeToDelete) return
    try {
      await deleteNode(nodeToDelete.name)
      toast.success(`节点 ${nodeToDelete.name} 已删除`)
      refresh()
    } catch (error) {
      toast.error('删除失败')
    } finally {
      setDeleteDialogOpen(false)
      setNodeToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; dotClass: string }> = {
      online: { label: '在线', variant: 'success', dotClass: 'bg-emerald-500' },
      offline: { label: '离线', variant: 'secondary', dotClass: 'bg-gray-400' },
      busy: { label: '满载', variant: 'warning', dotClass: 'bg-amber-500' },
    }
    const { label, variant, dotClass } = config[status] || { label: status, variant: 'secondary' as const, dotClass: 'bg-gray-400' }
    return (
      <Badge variant={variant} className="gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass} ${status === 'online' ? 'animate-pulse' : ''}`} />
        {label}
      </Badge>
    )
  }

  // 截断节点名称：前16 + ... + 后12
  const truncateNodeName = (name: string) => {
    if (name.length <= 30) return name
    return `${name.slice(0, 16)}...${name.slice(-12)}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" />
          节点管理
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 节点类型Tab */}
      <Tabs value={nodeTypeTab} onValueChange={handleTypeChange}>
        <TabsList className="bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
          <TabsTrigger 
            value="all"
            className="gap-2 px-4 py-2 rounded-md text-slate-600 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all"
          >
            <Server className="h-4 w-4" />
            全部节点
            <Badge variant="secondary" className="ml-1">{nodes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="edge"
            className="gap-2 px-4 py-2 rounded-md text-slate-600 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all"
          >
            <HardDrive className="h-4 w-4" />
            边缘节点
            <Badge variant="secondary" className="ml-1">{edgeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="cloud"
            className="gap-2 px-4 py-2 rounded-md text-slate-600 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all"
          >
            <Cloud className="h-4 w-4" />
            云端节点
            <Badge variant="secondary" className="ml-1">{cloudCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="搜索节点..." 
            className="pl-9 bg-muted/50 focus:bg-background transition-colors" 
            value={searchQuery} 
            onChange={(e) => handleSearchChange(e.target.value)} 
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-32 bg-muted/50">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="online">在线</SelectItem>
            <SelectItem value="offline">离线</SelectItem>
            <SelectItem value="busy">满载</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead>节点名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>所属集群</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>GPU</TableHead>
                <TableHead>可用/总数</TableHead>
                <TableHead>CPU/内存</TableHead>
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
              ) : filteredNodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                pagedNodes.map((node) => (
                <TableRow key={node.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        {node.node_type === 'edge' ? (
                          <HardDrive className="h-4 w-4 text-primary" />
                        ) : (
                          <Cloud className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium" title={node.name}>{truncateNodeName(node.name)}</div>
                        <code className="text-xs text-muted-foreground font-mono">{node.id}</code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={node.node_type === 'edge' ? 'outline' : 'secondary'} className="gap-1">
                      {node.node_type === 'edge' ? (
                        <><HardDrive className="h-3 w-3" /> 边缘</>
                      ) : (
                        <><Cloud className="h-3 w-3" /> 云端</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-md bg-muted/50 text-sm">{node.cluster}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(node.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{node.gpu_model}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-emerald-500 font-medium">{node.gpu_available}</span>
                    <span className="text-muted-foreground"> / {node.gpu_count}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{node.cpu_cores}核 / {node.memory}GB</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                        <DropdownMenuItem><Power className="h-4 w-4 mr-2" />维护模式</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteClick({ id: node.id, name: node.name })}
                        >
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
          <Pagination
            page={currentPage} pageSize={pageSize} total={filteredNodes.length}
            onPageChange={setCurrentPage} onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除节点</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除节点 <span className="font-medium text-foreground">{nodeToDelete?.name}</span> 吗？
              <br />
              此操作将从K8s集群中移除该节点，不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
