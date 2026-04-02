'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Loader2, Mail, Lock, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

const forgotPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})

const resetPasswordSchema = z.object({
  password: z.string().min(8, '密码长度至少8位'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

function ForgotPasswordContent() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const resetToken = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isResetSuccess, setIsResetSuccess] = useState(false)

  // -- 发送重置邮件表单 --
  const forgotForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onForgotSubmit = async (data: ForgotPasswordValues) => {
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setIsSubmitted(true)
      toast.success('重置密码邮件已发送')
    } catch {
      // Error handled in API client
    } finally {
      setIsLoading(false)
    }
  }

  // -- 设置新密码表单 --
  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onResetSubmit = async (data: ResetPasswordValues) => {
    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token: resetToken,
        new_password: data.password,
      })
      setIsResetSuccess(true)
      toast.success('密码重置成功')
    } catch {
      // Error handled in API client
    } finally {
      setIsLoading(false)
    }
  }

  // ── 重置成功页 ──
  if (isResetSuccess) {
    return (
      <Card className="card-clean shadow-lg">
        <CardContent className="space-y-4 text-center pt-8 pb-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold">密码重置成功</h3>
          <p className="text-muted-foreground">您的密码已更新，请使用新密码登录</p>
          <Button asChild className="mt-4 rounded-lg">
            <Link href="/login">去登录</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── 设置新密码页（有token参数） ──
  if (resetToken) {
    return (
      <Card className="card-clean shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-xl font-bold text-primary">L</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">设置新密码</CardTitle>
          <CardDescription>请输入您的新密码</CardDescription>
        </CardHeader>
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="至少8位，包含字母和数字"
                  className="pl-9 h-11" {...resetForm.register('password')} />
              </div>
              {resetForm.formState.errors.password && (
                <p className="text-sm text-red-500">{resetForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type="password" placeholder="再次输入新密码"
                  className="pl-9 h-11" {...resetForm.register('confirmPassword')} />
              </div>
              {resetForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">{resetForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-11 text-base rounded-lg" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认重置
            </Button>
          </CardFooter>
        </form>
      </Card>
    )
  }

  // ── 邮件已发送确认页 ──
  if (isSubmitted) {
    return (
      <Card className="card-clean shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t('forgotPassword')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <Mail className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-muted-foreground">重置密码链接已发送到您的邮箱，请查收</p>
          <Button asChild variant="outline" className="mt-4 rounded-lg">
            <Link href="/login">返回登录</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── 发送重置邮件表单 ──
  return (
    <Card className="card-clean shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xl font-bold text-primary">L</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">{t('forgotPassword')}</CardTitle>
        <CardDescription>输入您的邮箱，我们将发送重置密码链接</CardDescription>
      </CardHeader>
      <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder={t('emailPlaceholder')}
                className="pl-9 h-11" {...forgotForm.register('email')} />
            </div>
            {forgotForm.formState.errors.email && (
              <p className="text-sm text-red-500">{forgotForm.formState.errors.email.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full h-11 text-base rounded-lg" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            发送重置链接
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            想起密码了？{' '}
            <Link href="/login" className="text-primary hover:underline">{t('login')}</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <ForgotPasswordContent />
        </Suspense>
      </motion.div>
    </div>
  )
}
