'use client'

import { Gift, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

const vouchers = [
  { id: '1', name: '充值赠送', amount: 50, validUntil: '2024-06-30', status: 'valid', source: '充值500赠送' },
  { id: '2', name: '活动奖励', amount: 20, validUntil: '2024-03-15', status: 'valid', source: '春节活动' },
  { id: '3', name: '新用户礼包', amount: 10, validUntil: '2024-01-31', status: 'used', source: '注册赠送' },
]

export default function VouchersPage() {
  const [tab, setTab] = useState('valid')

  const filteredVouchers = vouchers.filter(v => 
    tab === 'valid' ? v.status === 'valid' : v.status !== 'valid'
  )

  const totalValid = vouchers.filter(v => v.status === 'valid').reduce((sum, v) => sum + v.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">代金券</h1>
      </div>

      {/* 统计 */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">可用代金券余额</div>
              <div className="text-3xl font-bold text-primary">¥ {totalValid.toFixed(2)}</div>
            </div>
            <Gift className="h-12 w-12 text-primary/30" />
          </div>
        </CardContent>
      </Card>

      {/* 代金券列表 */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="valid">可用 ({vouchers.filter(v => v.status === 'valid').length})</TabsTrigger>
          <TabsTrigger value="invalid">已使用/已过期</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid gap-4">
            {filteredVouchers.map((voucher) => (
              <Card key={voucher.id} className={voucher.status !== 'valid' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-lg flex flex-col items-center justify-center">
                        <div className="text-xs">¥</div>
                        <div className="text-2xl font-bold">{voucher.amount}</div>
                      </div>
                      <div>
                        <div className="font-medium mb-1">{voucher.name}</div>
                        <div className="text-sm text-muted-foreground mb-1">{voucher.source}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          有效期至 {voucher.validUntil}
                        </div>
                      </div>
                    </div>
                    <Badge variant={voucher.status === 'valid' ? 'default' : 'secondary'}>
                      {voucher.status === 'valid' ? '可用' : '已使用'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredVouchers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无代金券</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
