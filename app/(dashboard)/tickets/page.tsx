'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  RefreshCw,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import toast from 'react-hot-toast'

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
}

interface PaginatedResponse {
  list: Ticket[]
  total: number
  page: number
  size: number
}

export default function TicketsPage() {
  const t = useTranslations('tickets')
  const tc = useTranslations('common')
  const { token } = useAuthStore()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [creating, setCreating] = useState(false)

  const [newTicket, setNewTicket] = useState({
    title: '',
    content: '',
    category: 'other',
    priority: 'medium',
  })

  useEffect(() => {
    if (token) {
      api.setToken(token)
      fetchTickets()
    }
  }, [token, page, statusFilter])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, size: 10 }
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get<PaginatedResponse>('/tickets', params)
      setTickets(data.list)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.content.trim()) {
      toast.error('请填写标题和内容')
      return
    }

    setCreating(true)
    try {
      await api.post('/tickets', newTicket)
      toast.success(t('submitSuccess'))
      setShowCreateDialog(false)
      setNewTicket({ title: '', content: '', category: 'other', priority: 'medium' })
      fetchTickets()
    } catch (error) {
      console.error('Failed to create ticket:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await api.post(`/tickets/${ticketId}/close`)
      toast.success('工单已关闭')
      fetchTickets()
      setShowDetailDialog(false)
    } catch (error) {
      console.error('Failed to close ticket:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; icon: typeof Clock }> = {
      open: { variant: 'warning', icon: Clock },
      processing: { variant: 'default', icon: Loader2 },
      resolved: { variant: 'success', icon: CheckCircle },
      closed: { variant: 'secondary', icon: XCircle },
    }
    const c = config[status] || { variant: 'secondary' as const, icon: AlertCircle }
    const Icon = c.icon
    return (
      <Badge variant={c.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {t(`statuses.${status}`)}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
      medium: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[priority] || colors.medium}`}>
        {t(`priorities.${priority}`)}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tc('total', { count: total })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchTickets()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {tc('refresh')}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createTicket')}
          </Button>
        </div>
      </div>

      {/* 筛选 */}
      <Card className="card-clean">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
                        <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('allTickets')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('allTickets')}</SelectItem>
                <SelectItem value="open">{t('statuses.open')}</SelectItem>
                <SelectItem value="processing">{t('statuses.processing')}</SelectItem>
                <SelectItem value="resolved">{t('statuses.resolved')}</SelectItem>
                <SelectItem value="closed">{t('statuses.closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 工单列表 */}
      <Card className="card-clean">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">{t('ticketTitle')}</TableHead>
                <TableHead className="w-[100px]">{t('category')}</TableHead>
                <TableHead className="w-[80px]">{t('priority')}</TableHead>
                <TableHead className="w-[120px]">{t('status')}</TableHead>
                <TableHead className="w-[160px]">{t('createdAt')}</TableHead>
                <TableHead className="w-[100px]">{tc('operations')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('noTickets')}
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium truncate max-w-[240px]" title={ticket.title}>{ticket.title}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[240px]" title={ticket.content}>
                        {ticket.content}
                      </div>
                    </TableCell>
                    <TableCell>{t(`categories.${ticket.category}`)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(ticket.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTicket(ticket)
                          setShowDetailDialog(true)
                        }}
                      >
                        {t('viewDetail')}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 创建工单对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Send className="h-4 w-4 text-primary" />
              </div>
              {t('createTicket')}
            </DialogTitle>
            <DialogDescription>
              请详细描述您遇到的问题，我们会尽快处理
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('ticketTitle')}</label>
              <Input
                placeholder={t('titlePlaceholder')}
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('category')}</label>
                <Select
                  value={newTicket.category}
                  onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">{t('categories.technical')}</SelectItem>
                    <SelectItem value="billing">{t('categories.billing')}</SelectItem>
                    <SelectItem value="account">{t('categories.account')}</SelectItem>
                    <SelectItem value="suggestion">{t('categories.suggestion')}</SelectItem>
                    <SelectItem value="other">{t('categories.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('priority')}</label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('priorities.low')}</SelectItem>
                    <SelectItem value="medium">{t('priorities.medium')}</SelectItem>
                    <SelectItem value="high">{t('priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('priorities.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('content')}</label>
              <Textarea
                placeholder={t('contentPlaceholder')}
                rows={6}
                className="resize-none"
                value={newTicket.content}
                onChange={(e) => setNewTicket({ ...newTicket, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateTicket} disabled={creating} className="gap-2">
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {tc('submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 工单详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <span className="truncate max-w-[400px]">{selectedTicket?.title}</span>
              </div>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground bg-muted/30 dark:bg-muted/10 rounded-lg p-3">
                <span className="flex items-center gap-1.5">
                  <span className="text-foreground/70">{t('category')}:</span>
                  {t(`categories.${selectedTicket.category}`)}
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-foreground/70">{t('priority')}:</span>
                  {getPriorityBadge(selectedTicket.priority)}
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </span>
              </div>
              <div className="p-4 bg-muted/50 dark:bg-muted/20 rounded-lg border border-border/30">
                <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{selectedTicket.content}</p>
              </div>
              {selectedTicket.reply && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t('reply')}
                    {selectedTicket.replied_at && (
                      <span className="text-muted-foreground font-normal">
                        ({new Date(selectedTicket.replied_at).toLocaleString()})
                      </span>
                    )}
                  </div>
                  <div className="p-4 bg-green-500/5 dark:bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{selectedTicket.reply}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              {tc('cancel')}
            </Button>
            {selectedTicket && selectedTicket.status !== 'closed' && (
              <Button
                variant="destructive"
                onClick={() => handleCloseTicket(selectedTicket.id)}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                {t('closeTicket')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
