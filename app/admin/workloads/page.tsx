'use client'

import { useState } from 'react'
import { useAdminDeployments, useAdminDaemonSets, useAdminStatefulSets, useAdminNamespaces } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, RefreshCw, Trash2, Repeat2, Scale, Loader2, Box, Layers, Database } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function WorkloadsPage() {
  const [activeTab, setActiveTab] = useState('deployments')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">工作负载管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理 Kubernetes 工作负载资源</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="deployments" className="gap-2">
            <Box className="h-4 w-4" /> Deployments
          </TabsTrigger>
          <TabsTrigger value="daemonsets" className="gap-2">
            <Layers className="h-4 w-4" /> DaemonSets
          </TabsTrigger>
          <TabsTrigger value="statefulsets" className="gap-2">
            <Database className="h-4 w-4" /> StatefulSets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deployments" className="mt-4">
          <DeploymentsTab />
        </TabsContent>
        <TabsContent value="daemonsets" className="mt-4">
          <DaemonSetsTab />
        </TabsContent>
        <TabsContent value="statefulsets" className="mt-4">
          <StatefulSetsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== Deployments Tab ====================
function DeploymentsTab() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const { deployments, loading, total, refresh } = useAdminDeployments(nsFilter === '__all__' ? undefined : nsFilter, search || undefined)
  const pagedDeployments = paginateArray(deployments, currentPage, pageSize)

  const [scaleOpen, setScaleOpen] = useState(false)
  const [scaleTarget, setScaleTarget] = useState<{ ns: string; name: string; replicas: number } | null>(null)
  const [scaleReplicas, setScaleReplicas] = useState(1)
  const [scaling, setScaling] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [restartTarget, setRestartTarget] = useState<{ ns: string; name: string } | null>(null)
  const [restarting, setRestarting] = useState(false)

  const handleSearch = () => { setSearch(searchInput); setCurrentPage(1) }
  const handleNsChange = (v: string) => { setNsFilter(v); setCurrentPage(1) }

  const handleScale = async () => {
    if (!scaleTarget) return
    try {
      setScaling(true)
      await api.put(`/admin/deployments/${scaleTarget.ns}/${scaleTarget.name}/scale`, { replicas: scaleReplicas })
      toast.success(`副本数已调整为 ${scaleReplicas}`)
      setScaleOpen(false); refresh()
    } catch { toast.error('扩缩容失败') }
    finally { setScaling(false) }
  }

  const handleRestart = async () => {
    if (!restartTarget) return
    try {
      setRestarting(true)
      await api.post(`/admin/deployments/${restartTarget.ns}/${restartTarget.name}/restart`)
      toast.success('滚动重启已触发'); setRestartTarget(null); refresh()
    } catch { toast.error('重启失败') }
    finally { setRestarting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/deployments/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功'); setDeleteTarget(null); refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Select value={nsFilter} onValueChange={handleNsChange}>
              <SelectTrigger className="w-48"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部命名空间</SelectItem>
                {namespaces.map((ns) => <SelectItem key={ns.name} value={ns.name}>{ns.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-1 gap-2">
              <Input placeholder="搜索 Deployment 名称..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" /> 刷新</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" /> Deployments <Badge variant="secondary" className="ml-2">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无 Deployment</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Deployment</TableHead>
                  <TableHead>命名空间</TableHead>
                  <TableHead>副本数</TableHead>
                  <TableHead>镜像</TableHead>
                  <TableHead>策略</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedDeployments.map((dep: any) => (
                  <TableRow key={`${dep.namespace}/${dep.name}`}>
                    <TableCell className="font-medium max-w-[120px]">
                      {dep.instance_name ? (
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="block truncate text-primary">{dep.instance_name}</span></TooltipTrigger><TooltipContent><p>{dep.instance_name}</p></TooltipContent></Tooltip></TooltipProvider>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="max-w-[120px]">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="block truncate font-mono text-xs">{dep.name}</span></TooltipTrigger><TooltipContent><p>{dep.name}</p></TooltipContent></Tooltip></TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="outline">{dep.namespace}</Badge></TableCell>
                    <TableCell>
                      <span className={dep.ready_replicas === dep.replicas ? 'text-green-600' : 'text-yellow-600'}>
                        {dep.ready_replicas}/{dep.replicas}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="block truncate">{(dep.images || []).join(', ') || '-'}</span></TooltipTrigger><TooltipContent className="max-w-sm"><p className="break-all">{(dep.images || []).join(', ')}</p></TooltipContent></Tooltip></TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{dep.strategy || 'RollingUpdate'}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dep.created_at ? new Date(dep.created_at).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setScaleTarget({ ns: dep.namespace, name: dep.name, replicas: dep.replicas }); setScaleReplicas(dep.replicas); setScaleOpen(true) }} title="扩缩容"><Scale className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setRestartTarget({ ns: dep.namespace, name: dep.name })} title="滚动重启"><Repeat2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget({ ns: dep.namespace, name: dep.name })} title="删除"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={currentPage} pageSize={pageSize} total={total} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1) }} />
        </CardContent>
      </Card>

      {/* 扩缩容对话框 */}
      <Dialog open={scaleOpen} onOpenChange={setScaleOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>扩缩容</DialogTitle>
            <DialogDescription>调整 {scaleTarget?.ns}/{scaleTarget?.name} 的副本数</DialogDescription>
          </DialogHeader>
          <div className="py-4"><Input type="number" min={0} max={100} value={scaleReplicas} onChange={(e) => setScaleReplicas(parseInt(e.target.value) || 0)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScaleOpen(false)}>取消</Button>
            <Button onClick={handleScale} disabled={scaling}>{scaling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 Deployment <strong>{deleteTarget?.ns}/{deleteTarget?.name}</strong> 吗？此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重启确认 */}
      <AlertDialog open={!!restartTarget} onOpenChange={(open) => !open && setRestartTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认滚动重启</AlertDialogTitle>
            <AlertDialogDescription>确定要滚动重启 Deployment <strong>{restartTarget?.ns}/{restartTarget?.name}</strong> 吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} disabled={restarting}>{restarting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认重启</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ==================== DaemonSets Tab ====================
function DaemonSetsTab() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const { daemonSets, loading, total, refresh } = useAdminDaemonSets(nsFilter === '__all__' ? undefined : nsFilter, search || undefined)
  const pagedDaemonSets = paginateArray(daemonSets, currentPage, pageSize)

  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [restartTarget, setRestartTarget] = useState<{ ns: string; name: string } | null>(null)
  const [restarting, setRestarting] = useState(false)

  const handleSearch = () => { setSearch(searchInput); setCurrentPage(1) }
  const handleNsChange = (v: string) => { setNsFilter(v); setCurrentPage(1) }

  const handleRestart = async () => {
    if (!restartTarget) return
    try {
      setRestarting(true)
      await api.post(`/admin/workloads/daemonsets/${restartTarget.ns}/${restartTarget.name}/restart`)
      toast.success('滚动重启已触发'); setRestartTarget(null); refresh()
    } catch { toast.error('重启失败') }
    finally { setRestarting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/workloads/daemonsets/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功'); setDeleteTarget(null); refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Select value={nsFilter} onValueChange={handleNsChange}>
              <SelectTrigger className="w-48"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部命名空间</SelectItem>
                {namespaces.map((ns) => <SelectItem key={ns.name} value={ns.name}>{ns.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-1 gap-2">
              <Input placeholder="搜索 DaemonSet 名称..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" /> 刷新</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> DaemonSets <Badge variant="secondary" className="ml-2">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : daemonSets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无 DaemonSet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>命名空间</TableHead>
                  <TableHead>期望</TableHead>
                  <TableHead>当前</TableHead>
                  <TableHead>就绪</TableHead>
                  <TableHead>镜像</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedDaemonSets.map((ds: any) => (
                  <TableRow key={`${ds.namespace}/${ds.name}`}>
                    <TableCell className="font-medium max-w-[160px]">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="block truncate font-mono text-xs">{ds.name}</span></TooltipTrigger><TooltipContent><p>{ds.name}</p></TooltipContent></Tooltip></TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="outline">{ds.namespace}</Badge></TableCell>
                    <TableCell>{ds.desired_number_scheduled}</TableCell>
                    <TableCell>{ds.current_number_scheduled}</TableCell>
                    <TableCell>
                      <span className={ds.number_ready === ds.desired_number_scheduled ? 'text-green-600' : 'text-yellow-600'}>
                        {ds.number_ready}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="block truncate">{(ds.images || []).join(', ') || '-'}</span></TooltipTrigger><TooltipContent className="max-w-sm"><p className="break-all">{(ds.images || []).join(', ')}</p></TooltipContent></Tooltip></TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ds.created_at ? new Date(ds.created_at).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setRestartTarget({ ns: ds.namespace, name: ds.name })} title="滚动重启"><Repeat2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget({ ns: ds.namespace, name: ds.name })} title="删除"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={currentPage} pageSize={pageSize} total={total} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1) }} />
        </CardContent>
      </Card>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 DaemonSet <strong>{deleteTarget?.ns}/{deleteTarget?.name}</strong> 吗？此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重启确认 */}
      <AlertDialog open={!!restartTarget} onOpenChange={(open) => !open && setRestartTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认滚动重启</AlertDialogTitle>
            <AlertDialogDescription>确定要滚动重启 DaemonSet <strong>{restartTarget?.ns}/{restartTarget?.name}</strong> 吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} disabled={restarting}>{restarting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认重启</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ==================== StatefulSets Tab ====================
function StatefulSetsTab() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const { statefulSets, loading, total, refresh } = useAdminStatefulSets(nsFilter === '__all__' ? undefined : nsFilter, search || undefined)
  const pagedStatefulSets = paginateArray(statefulSets, currentPage, pageSize)

  const [scaleOpen, setScaleOpen] = useState(false)
  const [scaleTarget, setScaleTarget] = useState<{ ns: string; name: string; replicas: number } | null>(null)
  const [scaleReplicas, setScaleReplicas] = useState(1)
  const [scaling, setScaling] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [restartTarget, setRestartTarget] = useState<{ ns: string; name: string } | null>(null)
  const [restarting, setRestarting] = useState(false)

  const handleSearch = () => { setSearch(searchInput); setCurrentPage(1) }
  const handleNsChange = (v: string) => { setNsFilter(v); setCurrentPage(1) }

  const handleScale = async () => {
    if (!scaleTarget) return
    try {
      setScaling(true)
      await api.put(`/admin/workloads/statefulsets/${scaleTarget.ns}/${scaleTarget.name}/scale`, { replicas: scaleReplicas })
      toast.success(`副本数已调整为 ${scaleReplicas}`)
      setScaleOpen(false); refresh()
    } catch { toast.error('扩缩容失败') }
    finally { setScaling(false) }
  }

  const handleRestart = async () => {
    if (!restartTarget) return
    try {
      setRestarting(true)
      await api.post(`/admin/workloads/statefulsets/${restartTarget.ns}/${restartTarget.name}/restart`)
      toast.success('滚动重启已触发'); setRestartTarget(null); refresh()
    } catch { toast.error('重启失败') }
    finally { setRestarting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/workloads/statefulsets/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功'); setDeleteTarget(null); refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Select value={nsFilter} onValueChange={handleNsChange}>
              <SelectTrigger className="w-48"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部命名空间</SelectItem>
                {namespaces.map((ns) => <SelectItem key={ns.name} value={ns.name}>{ns.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-1 gap-2">
              <Input placeholder="搜索 StatefulSet 名称..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" /> 刷新</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> StatefulSets <Badge variant="secondary" className="ml-2">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : statefulSets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无 StatefulSet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>命名空间</TableHead>
                  <TableHead>副本数</TableHead>
                  <TableHead>就绪</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>镜像</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStatefulSets.map((ss: any) => (
                  <TableRow key={`${ss.namespace}/${ss.name}`}>
                    <TableCell className="font-medium max-w-[160px]">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="block truncate font-mono text-xs">{ss.name}</span></TooltipTrigger><TooltipContent><p>{ss.name}</p></TooltipContent></Tooltip></TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="outline">{ss.namespace}</Badge></TableCell>
                    <TableCell>
                      <span className={ss.ready_replicas === ss.replicas ? 'text-green-600' : 'text-yellow-600'}>
                        {ss.ready_replicas}/{ss.replicas}
                      </span>
                    </TableCell>
                    <TableCell>{ss.ready_replicas}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ss.service_name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="block truncate">{(ss.images || []).join(', ') || '-'}</span></TooltipTrigger><TooltipContent className="max-w-sm"><p className="break-all">{(ss.images || []).join(', ')}</p></TooltipContent></Tooltip></TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ss.created_at ? new Date(ss.created_at).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setScaleTarget({ ns: ss.namespace, name: ss.name, replicas: ss.replicas }); setScaleReplicas(ss.replicas); setScaleOpen(true) }} title="扩缩容"><Scale className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setRestartTarget({ ns: ss.namespace, name: ss.name })} title="滚动重启"><Repeat2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget({ ns: ss.namespace, name: ss.name })} title="删除"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={currentPage} pageSize={pageSize} total={total} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1) }} />
        </CardContent>
      </Card>

      {/* 扩缩容对话框 */}
      <Dialog open={scaleOpen} onOpenChange={setScaleOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>扩缩容</DialogTitle>
            <DialogDescription>调整 {scaleTarget?.ns}/{scaleTarget?.name} 的副本数</DialogDescription>
          </DialogHeader>
          <div className="py-4"><Input type="number" min={0} max={100} value={scaleReplicas} onChange={(e) => setScaleReplicas(parseInt(e.target.value) || 0)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScaleOpen(false)}>取消</Button>
            <Button onClick={handleScale} disabled={scaling}>{scaling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 StatefulSet <strong>{deleteTarget?.ns}/{deleteTarget?.name}</strong> 吗？此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重启确认 */}
      <AlertDialog open={!!restartTarget} onOpenChange={(open) => !open && setRestartTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认滚动重启</AlertDialogTitle>
            <AlertDialogDescription>确定要滚动重启 StatefulSet <strong>{restartTarget?.ns}/{restartTarget?.name}</strong> 吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} disabled={restarting}>{restarting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认重启</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
