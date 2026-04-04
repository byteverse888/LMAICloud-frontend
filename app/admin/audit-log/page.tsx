'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Search, ClipboardList, RefreshCw } from 'lucide-react'
import { useAdminAuditLog } from '@/hooks/use-api'
import { Pagination } from '@/components/ui/pagination'

const actionLabels: Record<string, string> = {
  create: '创建', delete: '删除', update: '更新', start: '启动', stop: '停止', restart: '重启', login: '登录', login_failed: '登录失败', logout: '登出', register: '注册', recharge: '充值',
}

const resourceTypeLabels: Record<string, string> = {
  instance: '实例', openclaw: 'OpenClaw', storage: '存储', image: '镜像', account: '账号', billing: '计费',
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [userEmail, setUserEmail] = useState('')
  const [keyword, setKeyword] = useState('')
  const [resourceType, setResourceType] = useState('all')

  const { logs, total, loading, refresh } = useAdminAuditLog(
    page, pageSize,
    userEmail || undefined,
    keyword || undefined,
    resourceType === 'all' ? undefined : resourceType,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          操作日志
        </h1>
        <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户邮箱..."
            className="pl-9"
            value={userEmail}
            onChange={(e) => { setUserEmail(e.target.value); setPage(1) }}
          />
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索关键词..."
            className="pl-9"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={resourceType} onValueChange={(v) => { setResourceType(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="资源类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="instance">实例</SelectItem>
            <SelectItem value="openclaw">OpenClaw</SelectItem>
            <SelectItem value="storage">存储</SelectItem>
            <SelectItem value="image">镜像</SelectItem>
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
                <TableHead>操作</TableHead>
                <TableHead>资源类型</TableHead>
                <TableHead>资源名称</TableHead>
                <TableHead>IP地址</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">暂无日志</TableCell>
                </TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-sm">{log.user_email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{actionLabels[log.action] || log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{resourceTypeLabels[log.resource_type] || log.resource_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{log.resource_name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.ip_address || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pagination
            page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
