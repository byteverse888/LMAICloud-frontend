'use client'

import { useState } from 'react'
import { Ticket, Clock, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const coupons = [
  { id: '1', name: '新用户专享', discount: '20%', minAmount: 50, maxDiscount: 20, validUntil: '2024-03-31', status: 'valid' },
  { id: '2', name: 'GPU算力优惠', discount: '¥10', minAmount: 100, maxDiscount: 10, validUntil: '2024-02-28', status: 'valid' },
  { id: '3', name: '春节活动券', discount: '15%', minAmount: 200, maxDiscount: 50, validUntil: '2024-02-15', status: 'expired' },
]

export default function CouponsPage() {
  const [redeemCode, setRedeemCode] = useState('')
  const [tab, setTab] = useState('valid')

  const filteredCoupons = coupons.filter(c => 
    tab === 'valid' ? c.status === 'valid' : c.status !== 'valid'
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">优惠券</h1>
      </div>

      {/* 兑换优惠券 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Gift className="h-5 w-5 text-primary" />
            <span className="text-sm">兑换优惠券</span>
            <Input 
              placeholder="请输入兑换码" 
              className="w-64"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
            />
            <Button>兑换</Button>
          </div>
        </CardContent>
      </Card>

      {/* 优惠券列表 */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="valid">可用 ({coupons.filter(c => c.status === 'valid').length})</TabsTrigger>
          <TabsTrigger value="invalid">已过期/已使用</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid gap-4">
            {filteredCoupons.map((coupon) => (
              <Card key={coupon.id} className={coupon.status !== 'valid' ? 'opacity-60' : ''}>
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-32 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 flex flex-col items-center justify-center rounded-l-lg">
                      <div className="text-2xl font-bold">{coupon.discount}</div>
                      <div className="text-xs opacity-80">满{coupon.minAmount}可用</div>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium mb-1">{coupon.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          有效期至 {coupon.validUntil}
                        </div>
                      </div>
                      {coupon.status === 'valid' ? (
                        <Button size="sm">立即使用</Button>
                      ) : (
                        <Badge variant="secondary">已过期</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredCoupons.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无优惠券</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
