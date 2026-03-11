'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { CreditCard, Wallet, Loader2, Sparkles, RefreshCw, QrCode, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useUserBalance, useWebSocketStatus } from '@/hooks/use-api'
import api from '@/lib/api'

const presetAmounts = [50, 100, 200, 500, 1000, 2000]

export default function BillingPage() {
  const t = useTranslations('billing')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100)
  const [customAmount, setCustomAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('wechat')
  const [paying, setPaying] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<{
    order_id: string
    qr_code_url: string
    amount: number
    expire_time: string
  } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [checkingStatus, setCheckingStatus] = useState(false)

  const { balance, frozenBalance, loading, refresh } = useUserBalance()
  
  // WebSocket监听充值成功
  useWebSocketStatus((data) => {
    if (data.type === 'recharge_success' && paymentInfo) {
      setPaymentStatus('success')
      refresh()
      toast.success('充值成功！')
    }
  })

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const finalAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0)

  const handlePay = async () => {
    if (finalAmount < 1) {
      toast.error('充值金额最少1元')
      return
    }
    
    try {
      setPaying(true)
      const { data } = await api.post<{
        order_id: string
        qr_code_url: string
        amount: number
        expire_time: string
        recharge_id: string
      }>('/billing/pay', {
        amount: finalAmount,
        payment_method: paymentMethod
      })
      
      setPaymentInfo({
        order_id: data.order_id,
        qr_code_url: data.qr_code_url,
        amount: data.amount,
        expire_time: data.expire_time
      })
      setPaymentStatus('pending')
      setShowPayDialog(true)
    } catch (err) {
      toast.error('创建支付订单失败')
    } finally {
      setPaying(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!paymentInfo) return
    
    try {
      setCheckingStatus(true)
      const { data } = await api.get<{ status: string }>(`/billing/pay/${paymentInfo.order_id}/status`)
      
      if (data.status === 'success') {
        setPaymentStatus('success')
        refresh()
        toast.success('充值成功！')
      } else if (data.status === 'failed') {
        setPaymentStatus('failed')
        toast.error('支付失败')
      }
    } catch (err) {
      // ignore
    } finally {
      setCheckingStatus(false)
    }
  }

  // 模拟支付成功（开发测试用）
  const mockPaySuccess = async () => {
    if (!paymentInfo) return
    
    try {
      await api.post(`/billing/pay/mock/${paymentInfo.order_id}`)
      setPaymentStatus('success')
      refresh()
      toast.success('充值成功！')
    } catch (err) {
      toast.error('模拟支付失败')
    }
  }

  // 自动轮询支付状态
  useEffect(() => {
    if (!showPayDialog || !paymentInfo || paymentStatus !== 'pending') return
    
    const interval = setInterval(checkPaymentStatus, 3000)
    return () => clearInterval(interval)
  }, [showPayDialog, paymentInfo, paymentStatus])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          {t('title')}
        </h1>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading} className="hover:bg-primary/10">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧充值区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 当前余额 */}
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                {t('balance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">加载中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-8">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">可用余额</span>
                    <div className={cn('text-3xl font-bold', balance < 0 ? 'text-red-500' : 'text-primary')}>
                      ¥{balance.toFixed(2)}
                    </div>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">冻结余额</span>
                    <div className="text-3xl font-bold text-muted-foreground">
                      ¥{frozenBalance.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 充值金额 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                {t('rechargeAmount')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {presetAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? 'default' : 'outline'}
                    className={cn(
                      "h-14 text-lg font-medium transition-all",
                      selectedAmount === amount 
                        ? "bg-primary shadow-lg shadow-primary/25 scale-105" 
                        : "hover:border-primary/50 hover:bg-primary/5"
                    )}
                    onClick={() => handleAmountSelect(amount)}
                  >
                    ¥{amount}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-2">
                <Label htmlFor="customAmount" className="whitespace-nowrap text-muted-foreground">
                  {t('customAmount')}
                </Label>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">¥</span>
                  <Input
                    id="customAmount"
                    type="number"
                    placeholder="请输入金额"
                    className="pl-7 h-11 bg-muted/50 focus:bg-background"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 支付方式 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                {t('paymentMethod')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={paymentMethod === 'wechat' ? 'default' : 'outline'}
                  className={cn(
                    "flex-1 h-14 gap-3 transition-all",
                    paymentMethod === 'wechat' 
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25" 
                      : "hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  )}
                  onClick={() => setPaymentMethod('wechat')}
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                  {t('wechatPay')}
                </Button>
                <Button
                  variant={paymentMethod === 'alipay' ? 'default' : 'outline'}
                  className={cn(
                    "flex-1 h-14 gap-3 transition-all",
                    paymentMethod === 'alipay' 
                      ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25" 
                      : "hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  )}
                  onClick={() => setPaymentMethod('alipay')}
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.422 15.358c-3.106-1.199-5.513-2.196-7.049-2.939.573-1.303 1.012-2.792 1.262-4.418H9.873V6.474h6.164V5.175H9.873V2.237H7.697v2.938H1.695v1.299h6.002V8.001H2.93v1.317h9.058c-.212 1.247-.54 2.406-.99 3.447-2.273-.943-3.988-1.34-5.112-1.34-1.89 0-3.188.973-3.188 2.478 0 1.588 1.489 2.773 3.94 2.773 2.093 0 4.021-.876 5.742-2.58.947.538 2.209 1.163 3.796 1.883-.37.706-.776 1.365-1.217 1.976H24v-1.4c0-1.24-.852-1.837-2.578-2.197zm-16.31.897c-1.436 0-2.044-.445-2.044-1.127 0-.622.596-1.073 1.622-1.073.928 0 2.04.299 3.546.918-1.178 1.011-2.168 1.282-3.124 1.282z"/>
                  </svg>
                  {t('alipay')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧订单确认 */}
        <div>
          <Card className="sticky top-24 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary to-purple-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">订单确认</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">充值金额</span>
                <span className="font-medium">¥{finalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">支付方式</span>
                <span className="font-medium">{paymentMethod === 'wechat' ? '微信支付' : '支付宝'}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">应付金额</span>
                  <span className="text-3xl font-bold gradient-text">¥{finalAmount.toFixed(2)}</span>
                </div>
              </div>
              <Button 
                variant="gradient" 
                className="w-full h-12 text-base" 
                size="lg" 
                disabled={finalAmount <= 0 || paying}
                onClick={handlePay}
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5 mr-2" />
                )}
                {t('payNow')}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                充值即表示同意《用户充值协议》
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 支付二维码对话框 */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {paymentMethod === 'wechat' ? '微信支付' : '支付宝'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {paymentStatus === 'success' ? (
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-emerald-500">支付成功</h3>
                <p className="text-muted-foreground mt-2">充值金额已到账</p>
                <Button className="mt-6" onClick={() => setShowPayDialog(false)}>
                  完成
                </Button>
              </div>
            ) : paymentStatus === 'failed' ? (
              <div className="text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-500">支付失败</h3>
                <p className="text-muted-foreground mt-2">请重新发起支付</p>
                <Button className="mt-6" onClick={() => setShowPayDialog(false)}>
                  关闭
                </Button>
              </div>
            ) : (
              <>
                {/* 模拟二维码展示 */}
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">扫码支付</p>
                    <p className="text-xs text-muted-foreground mt-1">¥{paymentInfo?.amount?.toFixed(2)}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  请使用{paymentMethod === 'wechat' ? '微信' : '支付宝'}扫描二维码完成支付
                </p>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={checkPaymentStatus}
                    disabled={checkingStatus}
                  >
                    {checkingStatus && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    查询支付状态
                  </Button>
                  {/* 开发测试用：模拟支付成功 */}
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={mockPaySuccess}
                  >
                    模拟支付成功
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
