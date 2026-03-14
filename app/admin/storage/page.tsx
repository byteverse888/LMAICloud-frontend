'use client'

import { useState } from 'react'
import { useAdminPVs, useAdminPVCs, useAdminStorageClasses, useAdminNamespaces } from '@/hooks/use-api'
import { Pagination, paginateArray } from '@/components/ui/pagination'
import { Card, CardContent } from '@/components/ui/card'
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
import { Search, RefreshCw, Trash2, Loader2, Database, Eye, HardDrive, Layers } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type TabKey = 'pv' | 'pvc' | 'sc'

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    Bound: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    Available: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    Released: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    Failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}`}>{status}</span>
}

// ========== PV Tab ==========
function PVTab() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { pvs, loading, total, refresh } = useAdminPVs(search || undefined)
  const paged = paginateArray(pvs, currentPage, pageSize)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailPV, setDetailPV] = useState<any>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/storage/pvs/${deleteTarget}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索 PV 名称..." className="pl-9 h-9" value={searchInput}
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>容量</TableHead>
                <TableHead>访问模式</TableHead>
                <TableHead>回收策略</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>StorageClass</TableHead>
                <TableHead>绑定 PVC</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无 PV 数据</TableCell></TableRow>
              ) : paged.map((pv: any) => (
                <TableRow key={pv.name}>
                  <TableCell className="font-mono text-xs">{pv.name}</TableCell>
                  <TableCell>{pv.capacity || '-'}</TableCell>
                  <TableCell className="text-xs">{(pv.access_modes || []).join(', ') || '-'}</TableCell>
                  <TableCell>{pv.reclaim_policy || '-'}</TableCell>
                  <TableCell>{statusBadge(pv.status || 'Unknown')}</TableCell>
                  <TableCell className="text-xs">{pv.storage_class || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{pv.claim || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailPV(pv)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(pv.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除 PV</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 PV「{deleteTarget}」吗？此操作不可撤销。</AlertDialogDescription>
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
      <Dialog open={!!detailPV} onOpenChange={o => !o && setDetailPV(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="pr-8">PV 详情 - {detailPV?.name}</DialogTitle></DialogHeader>
          {detailPV && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称：</span>{detailPV.name}</div>
                <div><span className="text-muted-foreground">容量：</span>{detailPV.capacity}</div>
                <div><span className="text-muted-foreground">状态：</span>{detailPV.status}</div>
                <div><span className="text-muted-foreground">StorageClass：</span>{detailPV.storage_class || '-'}</div>
                <div><span className="text-muted-foreground">回收策略：</span>{detailPV.reclaim_policy}</div>
                <div><span className="text-muted-foreground">卷模式：</span>{detailPV.volume_mode || '-'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">访问模式：</span>{(detailPV.access_modes || []).join(', ')}</div>
                <div className="col-span-2"><span className="text-muted-foreground">绑定 PVC：</span>{detailPV.claim || '未绑定'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== PVC Tab ==========
function PVCTab() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const ns = nsFilter === '__all__' ? undefined : nsFilter
  const { pvcs, loading, total, refresh } = useAdminPVCs(ns, search || undefined)
  const paged = paginateArray(pvcs, currentPage, pageSize)
  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailPVC, setDetailPVC] = useState<any>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/storage/pvcs/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={nsFilter} onValueChange={v => { setNsFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部命名空间</SelectItem>
            {namespaces.map(n => <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索 PVC 名称..." className="pl-9 h-9" value={searchInput}
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>容量</TableHead>
                <TableHead>请求大小</TableHead>
                <TableHead>访问模式</TableHead>
                <TableHead>StorageClass</TableHead>
                <TableHead>绑定 PV</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">暂无 PVC 数据</TableCell></TableRow>
              ) : paged.map((pvc: any) => (
                <TableRow key={`${pvc.namespace}/${pvc.name}`}>
                  <TableCell className="font-mono text-xs">{pvc.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{pvc.namespace}</Badge></TableCell>
                  <TableCell>{statusBadge(pvc.status || 'Unknown')}</TableCell>
                  <TableCell>{pvc.capacity || '-'}</TableCell>
                  <TableCell>{pvc.request || '-'}</TableCell>
                  <TableCell className="text-xs">{(pvc.access_modes || []).join(', ') || '-'}</TableCell>
                  <TableCell className="text-xs">{pvc.storage_class || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{pvc.volume || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailPVC(pvc)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteTarget({ ns: pvc.namespace, name: pvc.name })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除 PVC</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 PVC「{deleteTarget?.ns}/{deleteTarget?.name}」吗？此操作不可撤销。</AlertDialogDescription>
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
      <Dialog open={!!detailPVC} onOpenChange={o => !o && setDetailPVC(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="pr-8">PVC 详情 - {detailPVC?.name}</DialogTitle></DialogHeader>
          {detailPVC && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称：</span>{detailPVC.name}</div>
                <div><span className="text-muted-foreground">命名空间：</span>{detailPVC.namespace}</div>
                <div><span className="text-muted-foreground">状态：</span>{detailPVC.status}</div>
                <div><span className="text-muted-foreground">容量：</span>{detailPVC.capacity || '-'}</div>
                <div><span className="text-muted-foreground">请求：</span>{detailPVC.request || '-'}</div>
                <div><span className="text-muted-foreground">StorageClass：</span>{detailPVC.storage_class || '-'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">访问模式：</span>{(detailPVC.access_modes || []).join(', ')}</div>
                <div className="col-span-2"><span className="text-muted-foreground">绑定 PV：</span>{detailPVC.volume || '未绑定'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== StorageClass Tab ==========
function SCTab() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { storageClasses, loading, total, refresh } = useAdminStorageClasses(search || undefined)
  const paged = paginateArray(storageClasses, currentPage, pageSize)
  const [detailSC, setDetailSC] = useState<any>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索 StorageClass 名称..." className="pl-9 h-9" value={searchInput}
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Provisioner</TableHead>
                <TableHead>回收策略</TableHead>
                <TableHead>卷绑定模式</TableHead>
                <TableHead>允许扩容</TableHead>
                <TableHead>默认</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">暂无 StorageClass 数据</TableCell></TableRow>
              ) : paged.map((sc: any) => (
                <TableRow key={sc.name}>
                  <TableCell className="font-mono text-xs">{sc.name}</TableCell>
                  <TableCell className="text-xs">{sc.provisioner || '-'}</TableCell>
                  <TableCell>{sc.reclaim_policy || '-'}</TableCell>
                  <TableCell className="text-xs">{sc.volume_binding_mode || '-'}</TableCell>
                  <TableCell>{sc.allow_volume_expansion ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">是</Badge> : <Badge variant="outline">否</Badge>}</TableCell>
                  <TableCell>{sc.is_default ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">默认</Badge> : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailSC(sc)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
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

      {/* 详情弹窗 */}
      <Dialog open={!!detailSC} onOpenChange={o => !o && setDetailSC(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="pr-8">StorageClass 详情 - {detailSC?.name}</DialogTitle></DialogHeader>
          {detailSC && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称：</span>{detailSC.name}</div>
                <div><span className="text-muted-foreground">Provisioner：</span>{detailSC.provisioner}</div>
                <div><span className="text-muted-foreground">回收策略：</span>{detailSC.reclaim_policy}</div>
                <div><span className="text-muted-foreground">卷绑定模式：</span>{detailSC.volume_binding_mode}</div>
                <div><span className="text-muted-foreground">允许扩容：</span>{detailSC.allow_volume_expansion ? '是' : '否'}</div>
                <div><span className="text-muted-foreground">默认：</span>{detailSC.is_default ? '是' : '否'}</div>
              </div>
              {detailSC.parameters && Object.keys(detailSC.parameters).length > 0 && (
                <div>
                  <span className="text-muted-foreground font-medium">参数：</span>
                  <div className="mt-1 bg-muted/50 rounded p-2 font-mono text-xs space-y-1">
                    {Object.entries(detailSC.parameters).map(([k, v]) => (
                      <div key={k}>{k}: {String(v)}</div>
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

// ========== Main Page ==========
const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'pv', label: 'PersistentVolume', icon: HardDrive },
  { key: 'pvc', label: 'PersistentVolumeClaim', icon: Database },
  { key: 'sc', label: 'StorageClass', icon: Layers },
]

export default function StoragePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pv')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">存储管理</h1>
        <p className="text-muted-foreground text-sm mt-1">管理 Kubernetes 存储资源（PV / PVC / StorageClass）</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 border-b">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'pv' && <PVTab />}
      {activeTab === 'pvc' && <PVCTab />}
      {activeTab === 'sc' && <SCTab />}
    </div>
  )
}
