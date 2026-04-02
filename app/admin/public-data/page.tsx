'use client'

import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Loader2, Database, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useAdminPublicDatasets, createPublicDataset, updatePublicDataset, deletePublicDataset } from '@/hooks/use-api'
import toast from 'react-hot-toast'

const categoryOptions = [
  { value: 'all', label: '全部分类' },
  { value: 'dataset', label: '数据集' },
  { value: 'model', label: '模型' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
]

const emptyForm = {
  name: '',
  category: 'dataset',
  size: '',
  downloads: 0,
  description: '',
  tags: '',
  source: 'ModelScope',
  source_url: '',
  is_active: true,
  sort_order: 0,
}

export default function AdminPublicDataPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const pageSize = 20

  const { datasets, loading, total, refresh } = useAdminPublicDatasets(currentPage, pageSize, filterCategory, searchQuery)
  const totalPages = Math.ceil(total / pageSize)

  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setCurrentPage(1)
  }

  const handleAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  const handleEdit = (item: any) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      category: item.category || 'dataset',
      size: item.size || '',
      downloads: item.downloads || 0,
      description: item.description || '',
      tags: (item.tags || []).join(', '),
      source: item.source || '',
      source_url: item.source_url || '',
      is_active: item.is_active ?? true,
      sort_order: item.sort_order || 0,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('请输入名称'); return }
    try {
      setSaving(true)
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      if (editingId) {
        await updatePublicDataset(editingId, payload)
        toast.success('更新成功')
      } else {
        await createPublicDataset(payload)
        toast.success('创建成功')
      }
      setShowDialog(false)
      refresh()
    } catch { toast.error('操作失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      await deletePublicDataset(deleteId)
      toast.success('删除成功')
      setDeleteId(null)
      refresh()
    } catch { toast.error('删除失败') }
    finally { setDeleting(false) }
  }

  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          公开数据管理
        </h1>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          新增数据
        </Button>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索名称或描述..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>搜索</Button>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead className="text-right">下载量</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">暂无数据</TableCell>
                  </TableRow>
                ) : datasets.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{item.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{item.category}</Badge>
                    </TableCell>
                    <TableCell>{item.size || '-'}</TableCell>
                    <TableCell className="text-right">{formatDownloads(item.downloads)}</TableCell>
                    <TableCell>
                      {item.source_url ? (
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                          {item.source || '-'} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (item.source || '-')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑数据' : '新增数据'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>名称 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="数据集/模型名称" />
              </div>
              <div>
                <Label>分类</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dataset">数据集</SelectItem>
                    <SelectItem value="model">模型</SelectItem>
                    <SelectItem value="image">图片</SelectItem>
                    <SelectItem value="video">视频</SelectItem>
                    <SelectItem value="audio">音频</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>大小</Label>
                <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="如 15GB" />
              </div>
              <div>
                <Label>下载量</Label>
                <Input type="number" value={form.downloads} onChange={(e) => setForm({ ...form, downloads: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>排序</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <Label>描述</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="col-span-2">
                <Label>标签（逗号分隔）</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="LLM, 对话, 中文" />
              </div>
              <div>
                <Label>来源</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="ModelScope" />
              </div>
              <div>
                <Label>状态</Label>
                <Select value={form.is_active ? 'true' : 'false'} onValueChange={(v) => setForm({ ...form, is_active: v === 'true' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">启用</SelectItem>
                    <SelectItem value="false">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>来源链接</Label>
                <Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://modelscope.cn/..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">删除后无法恢复，确定要删除此数据吗？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
