'use client'

import { useState } from 'react'
import { FileText, Plus, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const invoices = [
  { id: 'INV-2024-0023', date: '2024-02-10', amount: 500.00, type: '增值税普通发票', status: '已开票', title: 'XX科技有限公司' },
  { id: 'INV-2024-0015', date: '2024-01-25', amount: 300.00, type: '增值税普通发票', status: '已开票', title: 'XX科技有限公司' },
  { id: 'INV-2024-0008', date: '2024-01-10', amount: 200.00, type: '增值税专用发票', status: '开票中', title: 'XX科技有限公司' },
]

export default function InvoicesPage() {
  const [tab, setTab] = useState('list')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">发票管理</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          申请开票
        </Button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">可开票金额</div>
            <div className="text-2xl font-bold">¥ 156.89</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">已开票金额</div>
            <div className="text-2xl font-bold">¥ 1,000.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">开票中</div>
            <div className="text-2xl font-bold">¥ 200.00</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">开票记录</TabsTrigger>
          <TabsTrigger value="info">发票信息</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>发票编号</TableHead>
                    <TableHead>申请日期</TableHead>
                    <TableHead>发票抬头</TableHead>
                    <TableHead>发票类型</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.id}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.title}</TableCell>
                      <TableCell>{invoice.type}</TableCell>
                      <TableCell className="text-right">¥{invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === '已开票' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.status === '已开票' && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">发票抬头</label>
                    <div className="font-medium">XX科技有限公司</div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">纳税人识别号</label>
                    <div className="font-medium font-mono">91110000XXXXXXXXXX</div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">注册地址</label>
                    <div className="font-medium">北京市朝阳区XX路XX号</div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">注册电话</label>
                    <div className="font-medium">010-12345678</div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">开户银行</label>
                    <div className="font-medium">XX银行XX支行</div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">银行账号</label>
                    <div className="font-medium font-mono">1234 5678 9012 3456</div>
                  </div>
                </div>
                <Button variant="outline">修改发票信息</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
