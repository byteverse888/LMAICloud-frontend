'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAdminDeployments, useAdminNamespaces } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, RefreshCw, Trash2, Repeat2, Scale, Loader2, Box, Square, XCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function DeploymentsPage() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const { deployments, loading, total, refresh } = useAdminDeployments(nsFilter === '__all__' ? undefined : nsFilter, search || undefined)
  const pagedDeployments = paginateArray(deployments, currentPage, pageSize)

  // 扩缩容
  const [scaleOpen, setScaleOpen] = useState(false)
  const [scaleTarget, setScaleTarget] = useState<{ ns: string; name: string; replicas: number } | null>(null)
  const [scaleReplicas, setScaleReplicas] = useState(1)
  const [scaling, setScaling] = useState(false)

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 滚动重启确认
  const [restartTarget, setRestartTarget] = useState<{ ns: string; name: string } | null>(null)
  const [restarting, setRestarting] = useState(false)

  // 仅当前页多选（不跨页，切换页面/筛选自动清空）
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const pageKeys = pagedDeployments.map((d: any) => `${d.namespace}/${d.name}`)
  const allPageSelected = pageKeys.length > 0 && pageKeys.every(k => selectedKeys.includes(k))
  const toggleSelectAll = () => {
    setSelectedKeys(allPageSelected ? [] : pageKeys)
  }
  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // 批量操作
  const [batchAction, setBatchAction] = useState<'stop' | 'restart' | 'delete' | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const selectedDeps = deployments.filter((d: any) => selectedKeys.includes(`${d.namespace}/${d.name}`))

  const batchActionConfig: Record<string, { title: string; desc: string; action: string; color: string }> = {
    stop: {
      title: '批量停止',
      desc: `确定要停止选中的 ${selectedDeps.length} 个 Deployment 吗？将把副本数缩至 0。`,
      action: '确认停止',
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    restart: {
      title: '批量重启',
      desc: `确定要滚动重启选中的 ${selectedDeps.length} 个 Deployment 吗？重启期间服务可能短暂不可用。`,
      action: '确认重启',
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    delete: {
      title: '批量删除',
      desc: `确定要删除选中的 ${selectedDeps.length} 个 Deployment 吗？此操作不可恢复！`,
      action: '确认删除',
      color: 'bg-red-600 hover:bg-red-700 text-white',
    },
  }

  const executeBatchAction = async () => {
    if (!batchAction) return
    setBatchLoading(true)
    let success = 0, fail = 0
    try {
      for (const dep of selectedDeps) {
        try {
          if (batchAction === 'stop') {
            await api.put(`/admin/deployments/${dep.namespace}/${dep.name}/scale`, { replicas: 0 })
          } else if (batchAction === 'restart') {
            await api.post(`/admin/deployments/${dep.namespace}/${dep.name}/restart`)
          } else if (batchAction === 'delete') {
            await api.delete(`/admin/deployments/${dep.namespace}/${dep.name}`)
          }
          success++
        } catch { fail++ }
      }
      const label = { stop: '停止', restart: '重启', delete: '删除' }[batchAction]
      if (success > 0) toast.success(`成功${label} ${success} 个${fail > 0 ? `，${fail} 个失败` : ''}`)
      if (fail > 0 && success === 0) toast.error('操作失败')
      setSelectedKeys([])
      refresh()
    } finally {
      setBatchLoading(false)
      setBatchAction(null)
    }
  }

  const handleSearch = () => { setSearch(searchInput); setCurrentPage(1); setSelectedKeys([]) }
  const handleNsChange = (v: string) => { setNsFilter(v); setCurrentPage(1); setSelectedKeys([]) }
  const handlePageSizeChange = (s: number) => { setPageSize(s); setCurrentPage(1); setSelectedKeys([]) }
  const handlePageChange = (p: number) => { setCurrentPage(p); setSelectedKeys([]) }

  const handleScale = async () => {
    if (!scaleTarget) return
    try {
      setScaling(true)
      await api.put(`/admin/deployments/${scaleTarget.ns}/${scaleTarget.name}/scale`, { replicas: scaleReplicas })
      toast.success(`副本数已调整为 ${scaleReplicas}`)
      setScaleOpen(false)
      refresh()
    } catch { toast.error('扩缩容失败') }
    finally { setScaling(false) }
  }

  const handleRestart = async () => {
    if (!restartTarget) return
    try {
      setRestarting(true)
      await api.post(`/admin/deployments/${restartTarget.ns}/${restartTarget.name}/restart`)
      toast.success('滚动重启已触发')
      setRestartTarget(null)
      refresh()
    } catch { toast.error('重启失败') }
    finally { setRestarting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/deployments/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功')
      setDeleteTarget(null)
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">部署管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理 Kubernetes Deployment 资源</p>
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
              <SelectTrigger className="w-48">
                <SelectValue placeholder="全部命名空间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部命名空间</SelectItem>
                {namespaces.map((ns) => (
                  <SelectItem key={ns.name} value={ns.name}>{ns.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="搜索 Deployment 名称..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 批量操作工具栏 */}
      {selectedKeys.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">已选 {selectedKeys.length} 项</span>
              <div className="h-4 w-px bg-border" />
              <Button size="sm" variant="outline" onClick={() => setBatchAction('stop')}>
                <Square className="h-3.5 w-3.5 mr-1.5" /> 批量停止
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBatchAction('restart')}>
                <Repeat2 className="h-3.5 w-3.5 mr-1.5" /> 批量重启
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setBatchAction('delete')}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> 批量删除
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button size="sm" variant="ghost" onClick={() => setSelectedKeys([])}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> 取消选择
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" /> Deployments
            <Badge variant="secondary" className="ml-2">{total}</Badge>
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected ? true : selectedKeys.length > 0 ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
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
                  <TableRow key={`${dep.namespace}/${dep.name}`} data-state={selectedKeys.includes(`${dep.namespace}/${dep.name}`) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedKeys.includes(`${dep.namespace}/${dep.name}`)}
                        onCheckedChange={() => toggleSelect(`${dep.namespace}/${dep.name}`)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px]">
                      {dep.instance_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {dep.instance_id ? (
                                <Link href={`/admin/instances/${dep.instance_id}`} className="block truncate text-primary hover:underline" target="_blank">
                                  {dep.instance_name}
                                </Link>
                              ) : dep.openclaw_instance_id ? (
                                <Link href={`/admin/openclaw/${dep.openclaw_instance_id}`} className="block truncate text-primary hover:underline" target="_blank">
                                  {dep.instance_name}
                                </Link>
                              ) : (
                                <span className="block truncate text-primary">{dep.instance_name}</span>
                              )}
                            </TooltipTrigger>
                            <TooltipContent><p>{dep.instance_name}</p></TooltipContent>
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
                            <span className="block truncate font-mono text-xs">{dep.name}</span>
                          </TooltipTrigger>
                          <TooltipContent><p>{dep.name}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="outline">{dep.namespace}</Badge></TableCell>
                    <TableCell>
                      <span className={dep.ready_replicas === dep.replicas ? 'text-green-600' : 'text-yellow-600'}>
                        {dep.ready_replicas}/{dep.replicas}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">{(dep.images || []).join(', ') || '-'}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm"><p className="break-all">{(dep.images || []).join(', ')}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{dep.strategy || 'RollingUpdate'}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dep.created_at ? new Date(dep.created_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setScaleTarget({ ns: dep.namespace, name: dep.name, replicas: dep.replicas }); setScaleReplicas(dep.replicas); setScaleOpen(true) }}
                          title="扩缩容"
                        >
                          <Scale className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setRestartTarget({ ns: dep.namespace, name: dep.name })}
                          title="滚动重启"
                        >
                          <Repeat2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget({ ns: dep.namespace, name: dep.name })}
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

      {/* 扩缩容对话框 */}
      <Dialog open={scaleOpen} onOpenChange={setScaleOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>扩缩容</DialogTitle>
            <DialogDescription>
              调整 {scaleTarget?.ns}/{scaleTarget?.name} 的副本数
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number" min={0} max={100}
              value={scaleReplicas}
              onChange={(e) => setScaleReplicas(parseInt(e.target.value) || 0)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScaleOpen(false)}>取消</Button>
            <Button onClick={handleScale} disabled={scaling}>
              {scaling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 Deployment <strong>{deleteTarget?.ns}/{deleteTarget?.name}</strong> 吗？此操作不可恢复。
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

      {/* 滚动重启确认 */}
      <AlertDialog open={!!restartTarget} onOpenChange={(open) => !open && setRestartTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认滚动重启</AlertDialogTitle>
            <AlertDialogDescription>
              确定要滚动重启 Deployment <strong>{restartTarget?.ns}/{restartTarget?.name}</strong> 吗？重启期间服务可能短暂不可用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} disabled={restarting}>
              {restarting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 确认重启
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量操作确认 */}
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
    </div>
  )
}
