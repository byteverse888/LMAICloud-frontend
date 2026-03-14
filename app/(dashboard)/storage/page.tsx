'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Upload, FolderOpen, File, Trash2, Download, Loader2, HardDrive, 
  RefreshCw, Database, FolderPlus, ChevronRight, Home, ArrowUp
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

const regions = [
  { id: 'beijing-b', name: '北京B区' },
  { id: 'neimeng-b', name: '内蒙B区' },
  { id: 'chongqing-a', name: '重庆A区' },
  { id: 'beijing-a', name: '北京A区' },
  { id: 'northwest-b', name: '西北B区' },
  { id: 'l20', name: 'L20专区' },
  { id: 'a800', name: 'A800专区' },
]

export default function StoragePage() {
  const t = useTranslations('storage')
  const [selectedRegion, setSelectedRegion] = useState('beijing-b')
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { 
    files, loading: filesLoading, currentPath, 
    uploadFile, deleteFile, downloadFile, navigateTo, refresh 
  } = useStorageFiles(selectedRegion, '/')
  const { quota, loading: quotaLoading } = useStorageQuota(selectedRegion)
  
  const storageInfo = quota || {
    used: 0,
    total: 200 * 1024 * 1024 * 1024,
    free: 20 * 1024 * 1024 * 1024,
    paid: 0,
  }

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
    } catch (err) {
      toast.error('上传失败')
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
    } catch (err) {
      toast.error('删除失败')
    }
  }

  const handleDownload = (fileId: string, fileName: string) => {
    downloadFile(fileId, fileName)
    toast.success('开始下载')
  }

  const handleNavigate = (item: any) => {
    if (item.is_directory) {
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
          <p className="text-sm text-amber-500 mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {t('mountPath')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={filesLoading} className="hover:bg-muted/80">
          <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 区域选择 */}
      <div className="flex gap-2 flex-wrap">
        {regions.map((region) => (
          <Button
            key={region.id}
            variant={selectedRegion === region.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedRegion(region.id)
              navigateTo('/')
            }}
            className={cn(
              "rounded-full transition-all",
              selectedRegion === region.id 
                ? "shadow-sm" 
                : "hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {region.name}
          </Button>
        ))}
      </div>

      {/* 存储信息 */}
      <Card className="card-clean overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
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
                      已使用 {((storageInfo.used / storageInfo.total) * 100).toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <a href="#" className="text-primary hover:underline transition-colors">{t('viewRules')}</a>
              <a href="#" className="text-primary hover:underline transition-colors">{t('expandInfo')}</a>
            </div>
          </div>
          <Progress 
            value={(storageInfo.used / storageInfo.total) * 100} 
            className="h-2 mb-4"
          />
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary shadow-sm shadow-primary/50" />
              <span className="text-muted-foreground">{t('free')}：</span>
              <span className="font-medium">{formatFileSize(storageInfo.free)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span className="text-muted-foreground">{t('paid')}：</span>
              <span className="font-medium">{formatFileSize(storageInfo.paid)}</span>
            </div>
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
                {regions.find(r => r.id === selectedRegion)?.name}
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
              <span className="text-sm text-amber-500 mr-2">
                {t('maxFiles')}
              </span>
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
                files.map((file: any) => (
                  <TableRow 
                    key={file.id} 
                    className={file.is_directory ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => handleNavigate(file)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center",
                          file.is_directory ? "bg-amber-500/10" : "bg-blue-500/10"
                        )}>
                          {file.is_directory ? (
                            <FolderOpen className="h-4 w-4 text-amber-500" />
                          ) : (
                            <File className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <span className="font-medium">{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{file.size_formatted || formatFileSize(file.size)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{file.modified_at || file.created_at}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {!file.is_directory && (
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.name) }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-destructive/10 text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.name) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>取消</Button>
            <Button 
              variant="gradient"
              onClick={async () => {
                if (!newFolderName.trim()) {
                  toast.error('请输入文件夹名称')
                  return
                }
                try {
                  // TODO: 调用创建文件夹API
                  toast.success('文件夹创建成功')
                  setShowNewFolderDialog(false)
                  setNewFolderName('')
                  refresh()
                } catch (err) {
                  toast.error('创建失败')
                }
              }}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
