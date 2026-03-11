'use client'

import { FileText, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const contracts = [
  { id: 'CT-2024-0001', name: 'GPU算力服务协议', signDate: '2024-01-15', validUntil: '2025-01-14', status: '生效中' },
  { id: 'CT-2024-0002', name: '数据存储服务协议', signDate: '2024-01-15', validUntil: '2025-01-14', status: '生效中' },
  { id: 'CT-2023-0005', name: 'GPU算力服务协议', signDate: '2023-02-01', validUntil: '2024-01-31', status: '已过期' },
]

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">合同管理</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>合同编号</TableHead>
                <TableHead>合同名称</TableHead>
                <TableHead>签署日期</TableHead>
                <TableHead>有效期至</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-mono">{contract.id}</TableCell>
                  <TableCell>{contract.name}</TableCell>
                  <TableCell>{contract.signDate}</TableCell>
                  <TableCell>{contract.validUntil}</TableCell>
                  <TableCell>
                    <Badge variant={contract.status === '生效中' ? 'default' : 'secondary'}>
                      {contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {contracts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>暂无合同</p>
        </div>
      )}
    </div>
  )
}
