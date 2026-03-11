'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Power, Settings, Loader2, RefreshCw } from 'lucide-react'
import { useAdminClusters } from '@/hooks/use-api'

export default function ClustersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { clusters, loading, refresh } = useAdminClusters()
  
  const filteredClusters = clusters.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      online: { label: '在线', className: 'bg-green-500' },
      offline: { label: '离线', className: 'bg-gray-500' },
      maintenance: { label: '维护中', className: 'bg-amber-500' },
    }
    const { label, className } = config[status] || { label: status, className: 'bg-gray-500' }
    return <Badge className={className}>{label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">集群管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            刷新
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            添加集群
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索集群..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>集群名称</TableHead>
                <TableHead>地区</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>节点数</TableHead>
                <TableHead>GPU 使用</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredClusters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredClusters.map((cluster: any) => (
                <TableRow key={cluster.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cluster.name}</div>
                      <div className="text-xs text-muted-foreground">{cluster.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>{cluster.region || '-'}</TableCell>
                  <TableCell>{getStatusBadge(cluster.status)}</TableCell>
                  <TableCell>{cluster.nodes}</TableCell>
                  <TableCell>
                    <span className="text-green-500">{cluster.gpuTotal - cluster.gpuAvailable}</span>
                    <span className="text-muted-foreground"> / {cluster.gpuTotal}</span>
                  </TableCell>
                  <TableCell>{cluster.created_at || '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                        <DropdownMenuItem><Settings className="h-4 w-4 mr-2" />设置</DropdownMenuItem>
                        <DropdownMenuItem><Power className="h-4 w-4 mr-2" />维护模式</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
