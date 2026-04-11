'use client'

import { useState } from 'react'
import { useAdminConfigMaps, useAdminSecrets, useAdminNamespaces } from '@/hooks/use-api'
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
import { Search, RefreshCw, Trash2, Loader2, Eye, FileCode, KeyRound } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type TabKey = 'configmap' | 'secret'

// ========== ConfigMap Tab ==========
function ConfigMapTab() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const ns = nsFilter === '__all__' ? undefined : nsFilter
  const { configMaps, loading, total, refresh } = useAdminConfigMaps(ns, search || undefined)
  const paged = paginateArray(configMaps, currentPage, pageSize)

  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/config/configmaps/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const showDetail = async (ns: string, name: string) => {
    try {
      setDetailLoading(true)
      const { data } = await api.get<any>(`/admin/config/configmaps/${ns}/${name}`)
      setDetail(data)
    } catch { toast.error('获取详情失败') }
    finally { setDetailLoading(false) }
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
          <Input placeholder="搜索 ConfigMap..." className="pl-9 h-9" value={searchInput}
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
                <TableHead>Key 数量</TableHead>
                <TableHead>Keys</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">暂无 ConfigMap</TableCell></TableRow>
              ) : paged.map((cm: any) => (
                <TableRow key={`${cm.namespace}/${cm.name}`}>
                  <TableCell className="font-mono text-xs font-medium">{cm.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{cm.namespace}</Badge></TableCell>
                  <TableCell>{cm.key_count ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {(cm.keys || []).join(', ') || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {cm.created_at ? new Date(cm.created_at).toLocaleString('zh-CN') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => showDetail(cm.namespace, cm.name)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteTarget({ ns: cm.namespace, name: cm.name })}>
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
            <AlertDialogTitle>确认删除 ConfigMap</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 ConfigMap「{deleteTarget?.ns}/{deleteTarget?.name}」吗？此操作不可撤销。</AlertDialogDescription>
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
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="pr-8">ConfigMap 详情 - {detail?.namespace}/{detail?.name}</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称：</span>{detail.name}</div>
                <div><span className="text-muted-foreground">命名空间：</span>{detail.namespace}</div>
                <div><span className="text-muted-foreground">Key 数量：</span>{detail.key_count}</div>
                <div><span className="text-muted-foreground">创建时间：</span>{detail.created_at ? new Date(detail.created_at).toLocaleString('zh-CN') : '-'}</div>
              </div>

              {/* Data 内容 */}
              {detail.data && Object.keys(detail.data).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Data</h4>
                  <div className="space-y-2">
                    {Object.entries(detail.data).map(([k, v]) => (
                      <div key={k} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 text-xs font-mono font-medium border-b">{k}</div>
                        <pre className="px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto bg-background">
                          {String(v)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Binary Data Keys */}
              {detail.binary_data_keys && detail.binary_data_keys.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Binary Data Keys</h4>
                  <div className="flex flex-wrap gap-1">
                    {detail.binary_data_keys.map((k: string) => (
                      <Badge key={k} variant="outline" className="text-xs font-mono">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Labels */}
              {detail.labels && Object.keys(detail.labels).length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Labels</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.labels).map(([k, v]) => (
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

// ========== Secret Tab ==========
function SecretTab() {
  const [nsFilter, setNsFilter] = useState<string>('__all__')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { namespaces } = useAdminNamespaces()
  const ns = nsFilter === '__all__' ? undefined : nsFilter
  const { secrets, loading, total, refresh } = useAdminSecrets(ns, search || undefined)
  const paged = paginateArray(secrets, currentPage, pageSize)

  const [deleteTarget, setDeleteTarget] = useState<{ ns: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.delete(`/admin/config/secrets/${deleteTarget.ns}/${deleteTarget.name}`)
      toast.success('删除成功')
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const showDetail = async (ns: string, name: string) => {
    try {
      setDetailLoading(true)
      const { data } = await api.get<any>(`/admin/config/secrets/${ns}/${name}`)
      setDetail(data)
    } catch { toast.error('获取详情失败') }
    finally { setDetailLoading(false) }
  }

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Opaque': 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
      'kubernetes.io/tls': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'kubernetes.io/dockerconfigjson': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'kubernetes.io/service-account-token': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}`}>{type}</span>
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
          <Input placeholder="搜索 Secret..." className="pl-9 h-9" value={searchInput}
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
                <TableHead>类型</TableHead>
                <TableHead>Key 数量</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">暂无 Secret</TableCell></TableRow>
              ) : paged.map((s: any) => (
                <TableRow key={`${s.namespace}/${s.name}`}>
                  <TableCell className="font-mono text-xs font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.namespace}</Badge></TableCell>
                  <TableCell>{typeBadge(s.type || 'Opaque')}</TableCell>
                  <TableCell>{s.key_count ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.created_at ? new Date(s.created_at).toLocaleString('zh-CN') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => showDetail(s.namespace, s.name)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteTarget({ ns: s.namespace, name: s.name })}>
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
            <AlertDialogTitle>确认删除 Secret</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 Secret「{deleteTarget?.ns}/{deleteTarget?.name}」吗？此操作不可撤销。</AlertDialogDescription>
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
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="pr-8">Secret 详情 - {detail?.namespace}/{detail?.name}</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">名称：</span>{detail.name}</div>
                <div><span className="text-muted-foreground">命名空间：</span>{detail.namespace}</div>
                <div><span className="text-muted-foreground">类型：</span>{detail.type}</div>
                <div><span className="text-muted-foreground">Key 数量：</span>{detail.key_count}</div>
                <div className="col-span-2"><span className="text-muted-foreground">创建时间：</span>{detail.created_at ? new Date(detail.created_at).toLocaleString('zh-CN') : '-'}</div>
              </div>

              {/* Data Info (脱敏) */}
              {detail.data_info && Object.keys(detail.data_info).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Data Keys <span className="text-xs text-muted-foreground font-normal">(值已脱敏)</span></h4>
                  <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1">
                    {Object.entries(detail.data_info).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="font-medium">{k}</span>
                        <span className="text-muted-foreground">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labels */}
              {detail.labels && Object.keys(detail.labels).length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Labels</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.labels).map(([k, v]) => (
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

// ========== Main Page ==========
const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'configmap', label: 'ConfigMap', icon: FileCode },
  { key: 'secret', label: 'Secret', icon: KeyRound },
]

export default function ConfigMapsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('configmap')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCode className="h-6 w-6 text-primary" />
          配置管理
        </h1>
        <p className="text-muted-foreground text-sm mt-1">管理 Kubernetes ConfigMap 和 Secret 配置资源</p>
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
      {activeTab === 'configmap' && <ConfigMapTab />}
      {activeTab === 'secret' && <SecretTab />}
    </div>
  )
}
