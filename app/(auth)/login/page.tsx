'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Loader2, Mail, Lock, Shield, Cpu, Server, Zap, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth-store'
import api, { toFullUrl } from '@/lib/api'

export default function LoginPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/'
  const [isLoading, setIsLoading] = useState(false)
  const [loginType, setLoginType] = useState<'password' | 'code' | 'wechat'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const { login, checkAuth, setToken, setRefreshToken } = useAuthStore()
  // 微信订阅号验证码登录
  const [wechatEnabled, setWechatEnabled] = useState(false)
  const [wechatOaName, setWechatOaName] = useState('')
  const [wechatQrGuide, setWechatQrGuide] = useState('')
  const [wxSessionId, setWxSessionId] = useState('')
  const [wxCode, setWxCode] = useState('')
  const [wxQrUrl, setWxQrUrl] = useState('')
  const [wxStatus, setWxStatus] = useState<'idle' | 'waiting' | 'confirmed' | 'expired'>('idle')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaEnabled, setCaptchaEnabled] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [footerText, setFooterText] = useState('')
  const [copyrightText, setCopyrightText] = useState('')
  const [siteLogo, setSiteLogo] = useState('')
  const [icpNumber, setIcpNumber] = useState('')
  const [icpLink, setIcpLink] = useState('https://beian.miit.gov.cn/')

  // 获取验证码（失败自动重试一次，避免瞬时故障导致验证码槽位空白）
  const fetchCaptcha = async (retry = 0) => {
    try {
      const { data } = await api.get<{ captcha_id: string; image_base64: string; enabled: boolean }>('/auth/captcha')
      if (data.enabled === false) {
        setCaptchaEnabled(false)
        return
      }
      if (!data.captcha_id || !data.image_base64) {
        throw new Error('验证码响应异常')
      }
      setCaptchaId(data.captcha_id)
      setCaptchaImage(data.image_base64)
      setCaptchaCode('')
    } catch (error) {
      console.error('验证码加载失败:', error)
      if (retry < 1) {
        setTimeout(() => fetchCaptcha(retry + 1), 1500)
      } else {
        toast.error('验证码加载失败，请点击上方按钮刷新')
      }
    }
  }

  // 检查验证码是否启用
  useEffect(() => {
    api.get<{ captcha_enabled?: boolean; site_name?: string; copyright_text?: string; footer_text?: string; site_logo?: string; icp_number?: string; icp_link?: string; wechat_sub_login_enabled?: boolean; wechat_sub_oa_name?: string; wechat_sub_qr_guide?: string }>('/system/site-info')
      .then(({ data }) => {
        const enabled = data.captcha_enabled !== false
        setCaptchaEnabled(enabled)
        if (enabled) fetchCaptcha()
        if (data.site_name) {
          setSiteName(data.site_name)
          document.title = `${data.site_name} - 登录`
        }
        if (data.copyright_text) setCopyrightText(data.copyright_text)
        if (data.footer_text) setFooterText(data.footer_text)
        if (data.site_logo) setSiteLogo(data.site_logo)
        if (data.icp_number) setIcpNumber(data.icp_number)
        if (data.icp_link) setIcpLink(data.icp_link)
        if (data.wechat_sub_login_enabled) setWechatEnabled(true)
        if (data.wechat_sub_oa_name) setWechatOaName(data.wechat_sub_oa_name)
        if (data.wechat_sub_qr_guide) setWechatQrGuide(data.wechat_sub_qr_guide)
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的邮箱地址')
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
        // 保存 token 到 store（含 api client），而非裸 localStorage：
        // 否则 checkAuth 拿不到 token，会话处于未登录态，角色跳转也失效
        if (data.token) {
          setToken(data.token)
          if (data.refresh_token) setRefreshToken(data.refresh_token)
        }
        // 验证码登录同样需要拉取用户信息，否则无法按角色决定跳转目标
        await checkAuth()
      }
      toast.success('登录成功')
      // 管理员一律进入管理控制台（redirect 指向 admin 子页时跟随参数）；普通用户跳 redirect 指定页面，默认首页
      const loggedInUser = useAuthStore.getState().user
      const isAdmin = loggedInUser?.role === 'admin'
      const target = isAdmin
        ? (redirectUrl.startsWith('/admin') ? redirectUrl : '/admin')
        : redirectUrl
      router.push(target)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败，请检查账号信息')
      if (captchaEnabled) fetchCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

  // 领取微信订阅号登录会话（4 位验证码 + 静态关注二维码）
  const startWechatSession = async () => {
    setWxStatus('idle')
    setWxCode('')
    setWxQrUrl('')
    try {
      const res = await fetch(`${API_BASE}/wechat/sub/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || '获取登录会话失败')
      }
      const data = await res.json()
      setWxSessionId(data.session_id)
      setWxCode(data.code)
      setWxQrUrl(data.qr_image_url)
      setWxStatus('waiting')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '微信登录初始化失败')
      setWxStatus('expired')
    }
  }

  // 切到微信页签且已启用时自动发起会话
  useEffect(() => {
    if (loginType === 'wechat' && wechatEnabled && !wxSessionId && wxStatus === 'idle') {
      startWechatSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginType, wechatEnabled])

  // 轮询扫码状态：confirmed 换登录态并跳转，expired 提示刷新
  useEffect(() => {
    if (loginType !== 'wechat' || !wxSessionId || wxStatus !== 'waiting') return
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/wechat/sub/session/status?session_id=${wxSessionId}`)
        const data = await res.json()
        if (data.status === 'confirmed' && data.token) {
          clearInterval(timer)
          setWxStatus('confirmed')
          setToken(data.token)
          if (data.refresh_token) setRefreshToken(data.refresh_token)
          await checkAuth()
          toast.success('登录成功')
          const loggedInUser = useAuthStore.getState().user
          const isAdmin = loggedInUser?.role === 'admin'
          router.push(isAdmin ? (redirectUrl.startsWith('/admin') ? redirectUrl : '/admin') : redirectUrl)
        } else if (data.status === 'expired') {
          clearInterval(timer)
          setWxStatus('expired')
        }
      } catch { /* 轮询失败静默重试 */ }
    }, 2000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginType, wxSessionId, wxStatus])

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
            <img src={siteLogo ? toFullUrl(siteLogo) : '/logo.png'} alt="Logo" className="w-10 h-10 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }} />
            <span className="text-xl font-bold text-white drop-shadow-sm">{siteName}</span>
          </div>
        </div>

        {/* 中间内容 */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-md">开启您的 AI 算力之旅</h1>
            <p className="text-white/90 text-lg drop-shadow-sm">分布式闲置算力，价格优惠，让 AI 算力人人可得</p>
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
              <div className="text-white/80 text-xs mt-1">按需付费，小时级计费</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
              <Server className="h-7 w-7 text-white mb-3 drop-shadow-sm" />
              <div className="text-white font-semibold text-sm">稳定可靠</div>
              <div className="text-white/80 text-xs mt-1">99% 服务可用性</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
              <Users className="h-7 w-7 text-white mb-3 drop-shadow-sm" />
              <div className="text-white font-semibold text-sm">算力共享</div>
              <div className="text-white/80 text-xs mt-1">汇聚全网闲置 GPU，低价共享</div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="relative z-10 text-white/70 text-sm space-y-1">
          <div>{copyrightText}</div>
          {(footerText || icpNumber) && (
            <div className="flex items-center justify-start gap-2 text-xs">
              {footerText && <span>{footerText}</span>}
              {footerText && icpNumber && <span>|</span>}
              {icpNumber && <span>{icpNumber}</span>}
            </div>
          )}
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
              <img src={siteLogo ? toFullUrl(siteLogo) : '/logo.png'} alt="Logo" className="w-10 h-10 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }} />
            </div>
            <h2 className="text-2xl font-bold">欢迎回来</h2>
            <p className="text-muted-foreground mt-2">登录您的 {siteName} 账号</p>
          </div>

          <Tabs value={loginType} onValueChange={(v) => setLoginType(v as 'password' | 'code' | 'wechat')} className="w-full">
            {/* 邮箱验证码登录暂时隐藏；微信订阅号登录启用时展示「密码/微信」切换 */}
            {/* <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="code">验证码登录</TabsTrigger>
              <TabsTrigger value="password">密码登录</TabsTrigger>
            </TabsList> */}
            {wechatEnabled && (
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="password">密码登录</TabsTrigger>
                <TabsTrigger value="wechat">微信扫码</TabsTrigger>
              </TabsList>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                {loginType !== 'wechat' && (
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
                )}

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

                <TabsContent value="wechat" className="mt-0">
                  <div className="flex flex-col items-center space-y-4 py-2">
                    {wxQrUrl ? (
                      <img
                        src={toFullUrl(wxQrUrl)}
                        alt="订阅号二维码"
                        className="w-48 h-48 rounded-lg border object-contain bg-white"
                      />
                    ) : (
                      <div className="w-48 h-48 rounded-lg border flex items-center justify-center text-muted-foreground text-sm">
                        {wxStatus === 'expired' ? '二维码已过期' : '加载中...'}
                      </div>
                    )}
                    <div className="text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {wechatQrGuide || '扫码关注订阅号，将下方验证码发送到公众号完成登录'}
                      </div>
                      <div className="text-3xl font-bold tracking-[0.3em] text-primary">{wxCode || '----'}</div>
                      {wechatOaName && <div className="text-xs text-muted-foreground">公众号：{wechatOaName}</div>}
                    </div>
                    <div className="text-sm h-5">
                      {wxStatus === 'waiting' && <span className="text-muted-foreground">等待扫码并发送验证码...</span>}
                      {wxStatus === 'confirmed' && <span className="text-green-600">登录成功，正在跳转...</span>}
                      {wxStatus === 'expired' && (
                        <Button type="button" variant="outline" size="sm" onClick={startWechatSession}>
                          刷新二维码
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* 图形验证码（微信页签不展示） */}
                {captchaEnabled && loginType !== 'wechat' && (
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
                          onClick={() => fetchCaptcha()}
                          title="点击刷新验证码"
                        />
                      ) : (
                        <Button type="button" variant="outline" className="h-11 w-28" onClick={() => fetchCaptcha()}>
                          获取验证码
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {loginType !== 'wechat' && (
                <Button type="submit" className="w-full h-11 text-base rounded-lg" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登录
                </Button>
                )}
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
            {copyrightText}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
