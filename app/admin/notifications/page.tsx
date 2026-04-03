'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Bell, Plus, Trash2, Loader2, RefreshCw, Search, Send } from 'lucide-react'
import { useAdminNotifications, sendAdminNotification, deleteAdminNotification } from '@/hooks/use-api'
import toast from 'react-hot-toast'

export default function AdminNotificationsPage() {
  const [page, setPage] = useState(1)
  const [userEmail, setUserEmail] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const { notifications, loading, total, refresh } = useAdminNotifications(
    page, 20, userEmail || undefined, typeFilter === 'all' ? undefined : typeFilter
  )

  const [showSendDialog, setShowSendDialog] = useState(false)
  const [sendForm, setSendForm] = useState({ title: '', content: '', type: 'system', user_ids: '' })
  const [sending, setSending] = useState(false)

  const typeLabels: Record<string, string> = {
    system: '系统', billing: '计费', instance: '实例', points: '积分',
  }

  const handleSend = async () => {
    if (!sendForm.title.trim()) { toast.error('请输入通知标题'); return }
    setSending(true)
    try {
      const payload: any = { title: sendForm.title, content: sendForm.content, type: sendForm.type }
      if (sendForm.user_ids.trim()) {
        payload.user_ids = sendForm.user_ids.split(',').map(s => s.trim()).filter(Boolean)
      }
      await sendAdminNotification(payload)
      toast.success('通知发送成功')
      setShowSendDialog(false)
      setSendForm({ title: '', content: '', type: 'system', user_ids: '' })
      refresh()
    } catch { toast.error('发送失败') } finally { setSending(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该通知？')) return
    try { await deleteAdminNotification(id); refresh(); toast.success('已删除') }
    catch { toast.error('删除失败') }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          通知管理
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => setShowSendDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            发送通知
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索用户邮箱..." className="pl-9" value={userEmail}
            onChange={(e) => { setUserEmail(e.target.value); setPage(1) }} />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="system">系统</SelectItem>
            <SelectItem value="billing">计费</SelectItem>
            <SelectItem value="instance">实例</SelectItem>
            <SelectItem value="points">积分</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">暂无通知</TableCell>
                </TableRow>
              ) : (
                notifications.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {n.created_at ? new Date(n.created_at).toLocaleString('zh-CN') : '--'}
                    </TableCell>
                    <TableCell className="text-sm">{n.user_email || '--'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[n.type] || n.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{n.title}</TableCell>
                    <TableCell>
                      <Badge variant={n.is_read ? 'secondary' : 'default'}>
                        {n.is_read ? '已读' : '未读'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground leading-8">第 {page} / {totalPages} 页</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 发送通知对话框 */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发送通知</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>通知标题</Label>
              <Input value={sendForm.title} onChange={(e) => setSendForm(p => ({ ...p, title: e.target.value }))} placeholder="请输入标题" />
            </div>
            <div className="space-y-2">
              <Label>通知内容</Label>
              <Textarea value={sendForm.content} onChange={(e) => setSendForm(p => ({ ...p, content: e.target.value }))} placeholder="请输入内容（可选）" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>通知类型</Label>
              <Select value={sendForm.type} onValueChange={(v) => setSendForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">系统通知</SelectItem>
                  <SelectItem value="billing">计费通知</SelectItem>
                  <SelectItem value="instance">实例通知</SelectItem>
                  <SelectItem value="points">积分通知</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>目标用户</Label>
              <Input value={sendForm.user_ids} onChange={(e) => setSendForm(p => ({ ...p, user_ids: e.target.value }))} placeholder="留空发送给所有用户，或输入用户ID（逗号分隔）" />
              <p className="text-xs text-muted-foreground">不填写则发送给平台所有用户</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>取消</Button>
            <Button onClick={handleSend} disabled={sending || !sendForm.title.trim()}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
