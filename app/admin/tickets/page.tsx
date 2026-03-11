'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Search,
  Loader2,
  RefreshCw,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Trash2,
  Filter,
  Eye,
} from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth-store'

interface Ticket {
  id: string
  user_id: string
  title: string
  content: string
  category: string
  priority: string
  status: string
  handler_id?: string
  reply?: string
  replied_at?: string
  resolved_at?: string
  closed_at?: string
  created_at: string
  updated_at: string
  user_email?: string
  user_nickname?: string
  handler_nickname?: string
}

interface TicketStats {
  open: number
  processing: number
  resolved: number
  closed: number
  total: number
}

export default function AdminTicketsPage() {
  const { token } = useAuthStore()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats>({ open: 0, processing: 0, resolved: 0, closed: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  // 详情/回复弹窗
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyStatus, setReplyStatus] = useState('')
  const [replying, setReplying] = useState(false)

  // 删除确认
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    if (token) {
      api.setToken(token)
    }
  }, [token])

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { page, size: 20 }
      if (searchQuery) params.search = searchQuery
      if (statusFilter) params.status = statusFilter
      if (categoryFilter) params.category = categoryFilter
      if (priorityFilter) params.priority = priorityFilter

      const { data } = await api.get<{ list: Ticket[]; total: number }>('/admin/tickets', params)
      setTickets(data.list || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('获取工单列表失败:', err)
      toast.error('获取工单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, statusFilter, categoryFilter, priorityFilter])

  const fetchStats = async () => {
    try {
      const { data } = await api.get<TicketStats>('/admin/tickets/stats')
      setStats(data)
    } catch (err) {
      console.error('获取统计失败:', err)
    }
  }

  useEffect(() => {
    fetchTickets()
    fetchStats()
  }, [fetchTickets])

  // 回复工单
  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) {
      toast.error('请输入回复内容')
      return
    }
    try {
      setReplying(true)
      await api.post(`/admin/tickets/${selectedTicket.id}/reply`, {
        reply: replyContent,
        status: replyStatus || undefined,
      })
      toast.success('回复成功')
      setDetailDialogOpen(false)
      setReplyContent('')
      setReplyStatus('')
      fetchTickets()
      fetchStats()
    } catch (err) {
      console.error('回复失败:', err)
    } finally {
      setReplying(false)
    }
  }

  // 关闭工单
  const handleClose = async (ticket: Ticket) => {
    try {
      await api.post(`/admin/tickets/${ticket.id}/close`)
      toast.success('工单已关闭')
      fetchTickets()
      fetchStats()
      if (detailDialogOpen) setDetailDialogOpen(false)
    } catch (err) {
      console.error('关闭失败:', err)
    }
  }

  // 标记已解决
  const handleResolve = async (ticket: Ticket) => {
    try {
      await api.post(`/admin/tickets/${ticket.id}/resolve`)
      toast.success('工单已标记为已解决')
      fetchTickets()
      fetchStats()
      if (detailDialogOpen) setDetailDialogOpen(false)
    } catch (err) {
      console.error('操作失败:', err)
    }
  }

  // 删除工单
  const handleDelete = async () => {
    if (!deleteTicket) return
    try {
      setDeleteLoading(true)
      await api.delete(`/admin/tickets/${deleteTicket.id}`)
      toast.success('工单已删除')
      setDeleteDialogOpen(false)
      fetchTickets()
      fetchStats()
    } catch (err) {
      console.error('删除失败:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; icon: typeof Clock; label: string }> = {
      open: { variant: 'warning', icon: Clock, label: '待处理' },
      processing: { variant: 'default', icon: Loader2, label: '处理中' },
      resolved: { variant: 'success', icon: CheckCircle, label: '已解决' },
      closed: { variant: 'secondary', icon: XCircle, label: '已关闭' },
    }
    const c = config[status] || { variant: 'secondary' as const, icon: AlertCircle, label: status }
    const Icon = c.icon
    return (
      <Badge variant={c.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {c.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { color: string; label: string }> = {
      low: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: '低' },
      medium: { color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', label: '中' },
      high: { color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', label: '高' },
      urgent: { color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', label: '紧急' },
    }
    const c = config[priority] || config.medium
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>{c.label}</span>
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      technical: '技术问题',
      billing: '计费问题',
      account: '账户问题',
      suggestion: '建议反馈',
      other: '其他',
    }
    return labels[category] || category
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          工单管理
        </h1>
        <Button variant="outline" onClick={() => { fetchTickets(); fetchStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">全部工单</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('open')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-500">{stats.open}</div>
            <p className="text-xs text-muted-foreground">待处理</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('processing')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">处理中</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('resolved')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">已解决</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('closed')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-500">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">已关闭</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索标题或内容..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
              />
            </div>
            <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部状态</SelectItem>
                <SelectItem value="open">待处理</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter || '__all__'} onValueChange={(v) => setCategoryFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部分类</SelectItem>
                <SelectItem value="technical">技术问题</SelectItem>
                <SelectItem value="billing">计费问题</SelectItem>
                <SelectItem value="account">账户问题</SelectItem>
                <SelectItem value="suggestion">建议反馈</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter || '__all__'} onValueChange={(v) => setPriorityFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部优先级</SelectItem>
                <SelectItem value="urgent">紧急</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter(''); setCategoryFilter(''); setPriorityFilter(''); }}>
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 工单列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">标题</TableHead>
                <TableHead className="w-[120px]">提交用户</TableHead>
                <TableHead className="w-[100px]">分类</TableHead>
                <TableHead className="w-[80px]">优先级</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[100px]">处理人</TableHead>
                <TableHead className="w-[160px]">创建时间</TableHead>
                <TableHead className="w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无工单
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium truncate max-w-[240px]" title={ticket.title}>{ticket.title}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[240px]" title={ticket.content}>
                        {ticket.content}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{ticket.user_nickname || ticket.user_email}</div>
                    </TableCell>
                    <TableCell>{getCategoryLabel(ticket.category)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.handler_nickname || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket)
                            setReplyContent(ticket.reply || '')
                            setDetailDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                        {ticket.status !== 'closed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClose(ticket)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteTicket(ticket)
                            setDeleteDialogOpen(true)
                          }}
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
        </CardContent>
      </Card>

      {/* 分页 */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            第 {page} 页 / 共 {Math.ceil(total / 20)} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 详情/回复弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>{selectedTicket?.title}</span>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>提交用户: {selectedTicket.user_nickname || selectedTicket.user_email}</span>
                <span>分类: {getCategoryLabel(selectedTicket.category)}</span>
                <span>优先级: {getPriorityBadge(selectedTicket.priority)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                创建时间: {new Date(selectedTicket.created_at).toLocaleString()}
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="whitespace-pre-wrap">{selectedTicket.content}</p>
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">回复内容</label>
                    <Select value={replyStatus || '__none__'} onValueChange={(v) => setReplyStatus(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="更新状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">不更新状态</SelectItem>
                        <SelectItem value="processing">处理中</SelectItem>
                        <SelectItem value="resolved">已解决</SelectItem>
                        <SelectItem value="closed">关闭</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="输入回复内容..."
                    rows={4}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                  />
                </div>
              )}

              {selectedTicket.reply && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    已有回复
                    {selectedTicket.handler_nickname && (
                      <span className="text-muted-foreground font-normal">
                        (处理人: {selectedTicket.handler_nickname})
                      </span>
                    )}
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="whitespace-pre-wrap">{selectedTicket.reply}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            {selectedTicket && selectedTicket.status !== 'closed' && (
              <>
                <Button variant="secondary" onClick={() => handleResolve(selectedTicket)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  标记已解决
                </Button>
                <Button onClick={handleReply} disabled={replying} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white">
                  {replying ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  发送回复
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除工单 "{deleteTicket?.title}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
