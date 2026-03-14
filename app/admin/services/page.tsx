'use client'

import { useState } from 'react'
import { useAdminServices, useAdminNamespaces } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Search, RefreshCw, Trash2, Loader2, Network, Eye } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function formatPorts(ports: any[]) {
  if (!ports || ports.length === 0) return '-'
  return ports.map((p: any) => {
    let s = `${p.port}`
    if (p.target_port) s += `:${p.target_port}`
    if (p.node_port) s += `:${p.node_port}`
    s += `/${p.protocol || 'TCP'}`
    return s
  }).join(', ')
}

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    ClusterIP: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    NodePort: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    LoadBalancer: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    ExternalName: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}`}>{type}</span>
}

export default function ServicesPage() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const { services, loading, total, refresh } = useAdminServices(nsFilter === '__all__' ? undefined : nsFilter, search || undefined)
  const pagedServices = paginateArray(services, currentPage, pageSize)

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 详情
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSvc, setDetailSvc] = useState<any>(null)

  const handleSearch = () => { setSearch(searchInput); setCurrentPage(1) }
  const handleNsChange = (v: string) => { setNsFilter(v); setCurrentPage(1) }
  const handlePageSizeChange = (s: number) => { setPageSize(s); setCurrentPage(1) }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/services/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功')
      setDeleteTarget(null)
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  const showDetail = async (ns: string, name: string) => {
    try {
      const { data } = await api.get(`/admin/services/${ns}/${name}`)
      setDetailSvc(data)
      setDetailOpen(true)
    } catch { toast.error('获取详情失败') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">服务管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理 Kubernetes Service 资源</p>
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
                placeholder="搜索 Service 名称..."
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
            <Network className="h-5 w-5" /> Services
            <Badge variant="secondary" className="ml-2">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无 Service</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>命名空间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>Cluster IP</TableHead>
                  <TableHead>端口映射</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedServices.map((svc: any) => (
                  <TableRow key={`${svc.namespace}/${svc.name}`}>
                    <TableCell className="font-medium">{svc.name}</TableCell>
                    <TableCell><Badge variant="outline">{svc.namespace}</Badge></TableCell>
                    <TableCell>{typeBadge(svc.type)}</TableCell>
                    <TableCell className="text-sm font-mono">{svc.cluster_ip || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {formatPorts(svc.ports)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {svc.created_at ? new Date(svc.created_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => showDetail(svc.namespace, svc.name)} title="详情">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget({ ns: svc.namespace, name: svc.name })}
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
            onPageChange={setCurrentPage} onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Service 详情</DialogTitle>
          </DialogHeader>
          {detailSvc && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称:</span> <strong>{detailSvc.name}</strong></div>
                <div><span className="text-muted-foreground">命名空间:</span> {detailSvc.namespace}</div>
                <div><span className="text-muted-foreground">类型:</span> {detailSvc.type}</div>
                <div><span className="text-muted-foreground">Cluster IP:</span> <code>{detailSvc.cluster_ip}</code></div>
              </div>
              <div>
                <span className="text-muted-foreground">端口映射:</span>
                <div className="mt-1 bg-muted/50 rounded p-2 font-mono text-xs">
                  {(detailSvc.ports || []).map((p: any, i: number) => (
                    <div key={i}>{p.name || '-'}: {p.port} -&gt; {p.target_port}{p.node_port ? ` (NodePort: ${p.node_port})` : ''} / {p.protocol}</div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Selector:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(detailSvc.selector || {}).map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-xs">{k}={String(v)}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Labels:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(detailSvc.labels || {}).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-xs">{k}={String(v)}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 Service <strong>{deleteTarget?.ns}/{deleteTarget?.name}</strong> 吗？
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
    </div>
  )
}
