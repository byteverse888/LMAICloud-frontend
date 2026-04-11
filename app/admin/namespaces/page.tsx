'use client'

import { useState } from 'react'
import { useAdminNamespaces } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Search, RefreshCw, Trash2, Loader2, FolderTree, Plus, Eye, ShieldAlert } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const PROTECTED = new Set(['default', 'kube-system', 'kube-public', 'kube-node-lease'])

function statusBadge(status: string) {
  if (status === 'Active') return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{status}</Badge>
  if (status === 'Terminating') return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{status}</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function NamespacesPage() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces, loading, refresh } = useAdminNamespaces()

  // 搜索过滤
  const filtered = search
    ? namespaces.filter(ns => ns.name.toLowerCase().includes(search.toLowerCase()))
    : namespaces
  const total = filtered.length
  const paged = paginateArray(filtered, currentPage, pageSize)

  // 创建命名空间
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // 删除命名空间
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 详情弹窗
  const [detailNS, setDetailNS] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      setCreating(true)
      await api.post('/admin/clusters/namespaces', { name: newName.trim() })
      toast.success(`命名空间 ${newName} 创建成功`)
      setCreateOpen(false)
      setNewName('')
      refresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '创建失败')
    } finally { setCreating(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/clusters/namespaces/${deleteTarget}`)
      toast.success('删除成功')
      refresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '删除失败')
    } finally { setDeleting(false); setDeleteTarget(null) }
  }

  const showDetail = async (name: string) => {
    try {
      setDetailLoading(true)
      const { data } = await api.get<any>(`/admin/clusters/namespaces/${name}`)
      setDetailNS(data)
    } catch { toast.error('获取详情失败') }
    finally { setDetailLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderTree className="h-6 w-6 text-primary" />
          命名空间管理
        </h1>
        <p className="text-muted-foreground text-sm mt-1">查看、创建和删除 Kubernetes 命名空间，查看资源用量</p>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索命名空间..." className="pl-9 h-9" value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setSearch(searchInput), setCurrentPage(1))} />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setSearch(searchInput); setCurrentPage(1) }}>
          <Search className="h-4 w-4 mr-1" />搜索
        </Button>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />刷新
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">共 {total} 个</span>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />创建命名空间
        </Button>
      </div>

      {/* 表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">暂无命名空间</TableCell></TableRow>
              ) : paged.map((ns: any) => (
                <TableRow key={ns.name}>
                  <TableCell className="font-mono text-xs font-medium">{ns.name}</TableCell>
                  <TableCell>{statusBadge(ns.status || 'Active')}</TableCell>
                  <TableCell>
                    {PROTECTED.has(ns.name)
                      ? <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"><ShieldAlert className="h-3 w-3" />系统</Badge>
                      : <Badge variant="outline">自定义</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ns.created_at ? new Date(ns.created_at).toLocaleString('zh-CN') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => showDetail(ns.name)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!PROTECTED.has(ns.name) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget(ns.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > pageSize && (
        <Pagination page={currentPage} pageSize={pageSize} total={total}
          onPageChange={setCurrentPage} onPageSizeChange={s => { setPageSize(s); setCurrentPage(1) }} />
      )}

      {/* 创建弹窗 */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); setNewName('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>创建命名空间</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">名称</label>
              <Input className="mt-1" placeholder="例如: my-namespace" value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              <p className="text-xs text-muted-foreground mt-1">仅允许小写字母、数字和连字符，以字母或数字开头和结尾</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setNewName('') }}>取消</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除命名空间</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除命名空间「{deleteTarget}」吗？该命名空间下的所有资源将被一并删除，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 详情弹窗 */}
      <Dialog open={!!detailNS} onOpenChange={o => !o && setDetailNS(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="pr-8">命名空间详情 - {detailNS?.name}</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : detailNS && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称：</span>{detailNS.name}</div>
                <div><span className="text-muted-foreground">状态：</span>{detailNS.status}</div>
                <div><span className="text-muted-foreground">类型：</span>{detailNS.protected ? '系统' : '自定义'}</div>
                <div><span className="text-muted-foreground">创建时间：</span>{detailNS.created_at ? new Date(detailNS.created_at).toLocaleString('zh-CN') : '-'}</div>
              </div>

              {/* 资源用量 */}
              {detailNS.resources && (
                <div>
                  <h4 className="font-medium mb-2">资源用量</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Pods', value: detailNS.resources.pods ?? 0 },
                      { label: 'Services', value: detailNS.resources.services ?? 0 },
                      { label: 'ConfigMaps', value: detailNS.resources.configmaps ?? 0 },
                      { label: 'Secrets', value: detailNS.resources.secrets ?? 0 },
                    ].map(r => (
                      <div key={r.label} className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold">{r.value}</div>
                        <div className="text-xs text-muted-foreground">{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labels */}
              {detailNS.labels && Object.keys(detailNS.labels).length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Labels</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detailNS.labels).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-xs font-mono">{k}={String(v)}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
