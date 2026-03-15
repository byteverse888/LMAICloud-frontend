'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Upload, FolderOpen, File, Trash2, Loader2, HardDrive, 
  RefreshCw, Database, FolderPlus, ChevronRight, Home, ArrowUp,
  Link2, Copy, ChevronLeft, AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { formatFileSize, cn } from '@/lib/utils'
import { useStorageFiles, useStorageQuota } from '@/hooks/use-api'

export default function StoragePage() {
  const t = useTranslations('storage')
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; url: string; filename: string }>({ open: false, url: '', filename: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { 
    files, loading: filesLoading, currentPath, total, page, pageSize,
    uploadFile, deleteFile, getFileLink, createFolder, navigateTo, goToPage, refresh 
  } = useStorageFiles('/')
  const { quota, loading: quotaLoading, refresh: refreshQuota } = useStorageQuota()
  
  const storageInfo = quota || {
    used: 0,
    total: 10 * 1024 * 1024 * 1024,
    remaining: 10 * 1024 * 1024 * 1024,
    used_percent: 0,
    file_count: 0,
    max_file_count: 100,
    max_upload_size: 50 * 1024 * 1024,
  }

  const totalPages = Math.ceil(total / pageSize)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      await uploadFile(file)
      toast.success(`${file.name} 上传成功`)
      refreshQuota()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`确定要删除 ${fileName} 吗？`)) return
    try {
      await deleteFile(fileId)
      toast.success('删除成功')
      refreshQuota()
    } catch (err) {
      toast.error('删除失败')
    }
  }

  const handleGetLink = async (fileId: string) => {
    try {
      const { url, filename } = await getFileLink(fileId)
      setLinkDialog({ open: true, url, filename })
    } catch (err) {
      toast.error('获取下载链接失败')
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkDialog.url)
    toast.success('链接已复制到剪贴板')
  }

  const handleNavigate = (item: any) => {
    if (item.is_dir) {
      navigateTo(item.path)
    }
  }

  const handleGoUp = () => {
    const parts = currentPath.split('/').filter(Boolean)
    if (parts.length > 0) {
      parts.pop()
      navigateTo('/' + parts.join('/'))
    }
  }

  const handleGoHome = () => {
    navigateTo('/')
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) {
      toast.error('请输入文件夹名称')
      return
    }
    if (name.includes('/')) {
      toast.error('文件夹名称不能包含 /')
      return
    }
    try {
      await createFolder(name)
      toast.success('文件夹创建成功')
      setShowNewFolderDialog(false)
      setNewFolderName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    }
  }

  const pathParts = currentPath.split('/').filter(Boolean)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 标题和说明 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理您的文件和目录，支持通过下载链接在计算节点直接获取
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { refresh(); refreshQuota() }} disabled={filesLoading} className="hover:bg-muted/80">
          <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 存储配额信息 */}
      <Card className="card-clean overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Database className="h-7 w-7 text-primary" />
              </div>
              <div>
                {quotaLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">
                      {formatFileSize(storageInfo.used)}
                      <span className="text-lg text-muted-foreground font-normal"> / {formatFileSize(storageInfo.total)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      剩余 {formatFileSize(storageInfo.remaining)} ({(100 - storageInfo.used_percent).toFixed(1)}%)
                      <span className="mx-2">·</span>
                      文件 {storageInfo.file_count}/{storageInfo.max_file_count} 个
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <Progress 
            value={storageInfo.used_percent} 
            className="h-2"
          />
          {/* 使用限制提示 */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              单文件上限 {formatFileSize(storageInfo.max_upload_size)}
            </div>
            <div>存储上限 {formatFileSize(storageInfo.total)}</div>
            <div>文件数上限 {storageInfo.max_file_count} 个</div>
          </div>
        </CardContent>
      </Card>

      {/* 文件列表 */}
      <Card className="card-clean overflow-hidden">
        <CardHeader className="pb-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                文件管理
              </CardTitle>
              {/* 面包屑导航 */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-4">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleGoHome}>
                  <Home className="h-4 w-4" />
                </Button>
                {pathParts.map((part, index) => (
                  <div key={index} className="flex items-center">
                    <ChevronRight className="h-4 w-4" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => navigateTo('/' + pathParts.slice(0, index + 1).join('/'))}
                    >
                      {part}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowNewFolderDialog(true)}
              >
                <FolderPlus className="h-4 w-4" />
                新建文件夹
              </Button>
              <Button 
                size="sm" 
                variant="gradient" 
                className="gap-2"
                onClick={handleUploadClick}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t('upload')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-enhanced">
            <TableHeader>
              <TableRow>
                <TableHead>{t('fileName')}</TableHead>
                <TableHead>{t('size')}</TableHead>
                <TableHead>{t('updateTime')}</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* 返回上级 */}
              {currentPath !== '/' && (
                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={handleGoUp}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <ArrowUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-muted-foreground">..</span>
                    </div>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
              {filesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>暂无文件，点击上传按钮添加文件</p>
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <TableRow 
                    key={file.id} 
                    className={file.is_dir ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => handleNavigate(file)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center",
                          file.is_dir ? "bg-amber-500/10" : "bg-blue-500/10"
                        )}>
                          {file.is_dir ? (
                            <FolderOpen className="h-4 w-4 text-amber-500" />
                          ) : (
                            <File className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <span className="font-medium">{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{file.is_dir ? '-' : formatFileSize(file.size)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {file.updated_at ? new Date(file.updated_at).toLocaleString('zh-CN') : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!file.is_dir && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              title="获取下载链接"
                              onClick={(e) => { e.stopPropagation(); handleGetLink(file.id) }}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-destructive/10 text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.name) }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                共 {total} 项，第 {page}/{totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新建文件夹对话框 */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="请输入文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>取消</Button>
            <Button variant="gradient" onClick={handleCreateFolder}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 下载链接对话框 */}
      <Dialog open={linkDialog.open} onOpenChange={(open) => setLinkDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              下载链接
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              文件: <span className="font-medium text-foreground">{linkDialog.filename}</span>
            </p>
            <div className="flex items-center gap-2">
              <Input 
                value={linkDialog.url} 
                readOnly 
                className="text-xs font-mono"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink} title="复制链接">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>在计算节点执行以下命令下载:</p>
              <code className="block bg-muted px-2 py-1.5 rounded font-mono break-all">
                wget -O &quot;{linkDialog.filename}&quot; &quot;{linkDialog.url}&quot;
              </code>
              <code className="block bg-muted px-2 py-1.5 rounded font-mono break-all">
                curl -o &quot;{linkDialog.filename}&quot; &quot;{linkDialog.url}&quot;
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(prev => ({ ...prev, open: false }))}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
