'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Loader2, Mail, Lock, Shield, Cpu, Server, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth-store'
import api from '@/lib/api'

export default function LoginPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  const [isLoading, setIsLoading] = useState(false)
  const [loginType, setLoginType] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const { login, checkAuth } = useAuthStore()
  const [captchaId, setCaptchaId] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaEnabled, setCaptchaEnabled] = useState(false)

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const { data } = await api.get<{ captcha_id: string; image_base64: string; enabled: boolean }>('/auth/captcha')
      if (data.enabled === false) {
        setCaptchaEnabled(false)
        return
      }
      setCaptchaId(data.captcha_id)
      setCaptchaImage(data.image_base64)
      setCaptchaCode('')
    } catch {
      // 验证码不可用，忽略
    }
  }

  // 检查验证码是否启用
  useEffect(() => {
    api.get<{ captcha_enabled?: boolean }>('/system/site-info')
      .then(({ data }) => {
        const enabled = data.captcha_enabled !== false
        setCaptchaEnabled(enabled)
        if (enabled) fetchCaptcha()
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const sendVerifyCode = async () => {
    if (!email) {
      toast.error('请输入邮箱地址')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的邮箱地址')
      return
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || '发送失败')
      }
      toast.success('验证码已发送，请查收邮箱')
      setCountdown(60)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败，请重试')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('请输入邮箱地址')
      return
    }
    if (loginType === 'password' && !password) {
      toast.error('请输入密码')
      return
    }
    if (loginType === 'code' && !verifyCode) {
      toast.error('请输入验证码')
      return
    }

    setIsLoading(true)
    try {
      if (loginType === 'password') {
        await login(email, password, captchaEnabled ? captchaId : undefined, captchaEnabled ? captchaCode : undefined)
        await checkAuth()  // 刷新用户信息
      } else {
        // 验证码登录
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/login-with-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: verifyCode })
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.detail || '登录失败')
        }
        const data = await response.json()
        // 保存token
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
      }
      toast.success('登录成功')
      // 跳转到redirect参数指定的页面，默认首页
      router.push(redirectUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败，请检查账号信息')
      if (captchaEnabled) fetchCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌展示区 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-700 via-primary to-sky-500 p-12 flex-col justify-between relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/25 backdrop-blur rounded-lg flex items-center justify-center shadow-lg shadow-black/10">
              <span className="text-xl font-bold text-white">L</span>
            </div>
            <span className="text-xl font-bold text-white drop-shadow-sm">LMAICloud</span>
          </div>
        </div>

        {/* 中间内容 */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-md">开启您的 AI 算力之旅</h1>
            <p className="text-white/90 text-lg drop-shadow-sm">专业的 GPU 云计算平台，让 AI 训练更简单</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
              <Cpu className="h-7 w-7 text-white mb-3 drop-shadow-sm" />
              <div className="text-white font-semibold text-sm">强大算力</div>
              <div className="text-white/80 text-xs mt-1">RTX 4090/5090 随心用</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
              <Zap className="h-7 w-7 text-white mb-3 drop-shadow-sm" />
              <div className="text-white font-semibold text-sm">弹性伸缩</div>
              <div className="text-white/80 text-xs mt-1">按需付费，秒级计费</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
              <Server className="h-7 w-7 text-white mb-3 drop-shadow-sm" />
              <div className="text-white font-semibold text-sm">稳定可靠</div>
              <div className="text-white/80 text-xs mt-1">99.9% 服务可用性</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
              <Shield className="h-7 w-7 text-white mb-3 drop-shadow-sm" />
              <div className="text-white font-semibold text-sm">安全可信</div>
              <div className="text-white/80 text-xs mt-1">数据加密，隔离保护</div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="relative z-10 text-white/70 text-sm">
          © 2026 LMAICloud. All rights reserved.
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-primary">L</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold">欢迎回来</h2>
            <p className="text-muted-foreground mt-2">登录您的 LMAICloud 账号</p>
          </div>

          <Tabs value={loginType} onValueChange={(v) => setLoginType(v as 'password' | 'code')} className="w-full">
            {/* 验证码登录暂时隐藏 */}
            {/* <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="code">验证码登录</TabsTrigger>
              <TabsTrigger value="password">密码登录</TabsTrigger>
            </TabsList> */}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入邮箱地址"
                      className="pl-10 h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <TabsContent value="code" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verifyCode">验证码</Label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="verifyCode"
                          type="text"
                          placeholder="请输入6位验证码"
                          className="pl-10 h-11"
                          maxLength={6}
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 px-4 whitespace-nowrap"
                        onClick={sendVerifyCode}
                        disabled={countdown > 0}
                      >
                        {countdown > 0 ? `${countdown}s` : '发送验证码'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="password" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">密码</Label>
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        忘记密码？
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="请输入密码"
                        className="pl-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* 图形验证码 */}
                {captchaEnabled && (
                  <div className="space-y-2">
                    <Label>验证码</Label>
                    <div className="flex gap-3 items-center">
                      <Input
                        placeholder="请输入验证码"
                        className="h-11 flex-1"
                        maxLength={4}
                        value={captchaCode}
                        onChange={(e) => setCaptchaCode(e.target.value.toUpperCase())}
                      />
                      {captchaImage ? (
                        <img
                          src={captchaImage}
                          alt="验证码"
                          className="h-11 w-28 rounded-md border cursor-pointer bg-white object-contain"
                          onClick={fetchCaptcha}
                          title="点击刷新验证码"
                        />
                      ) : (
                        <Button type="button" variant="outline" className="h-11 w-28" onClick={fetchCaptcha}>
                          获取验证码
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base rounded-lg" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登录
                </Button>
              </div>
            </form>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                立即注册
              </Link>
            </p>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            登录即表示同意{' '}
            <Link href="/agreements/user" className="text-primary hover:underline">用户协议</Link>
            {' '}、{' '}
            <Link href="/agreements/privacy" className="text-primary hover:underline">隐私政策</Link>
            {' '}和{' '}
            <Link href="/agreements/service" className="text-primary hover:underline">产品服务协议</Link>
          </div>
          
          {/* 小屏幕显示版权信息 */}
          <div className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            © 2026 LMAICloud. All rights reserved.
          </div>
        </motion.div>
      </div>
    </div>
  )
}
