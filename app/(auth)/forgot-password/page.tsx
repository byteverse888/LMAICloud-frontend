'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Loader2, Mail } from 'lucide-react'
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

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordValues) => {
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setIsSubmitted(true)
      toast.success('重置密码邮件已发送')
    } catch (error) {
      // Error handled in API client
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">L</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('forgotPassword')}</CardTitle>
          <CardDescription className="text-slate-400">
            输入您的邮箱，我们将发送重置密码链接
          </CardDescription>
        </CardHeader>
        {isSubmitted ? (
          <CardContent className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Mail className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <p className="text-muted-foreground">
              重置密码链接已发送到您的邮箱，请查收
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/login">返回登录</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    className="pl-9 bg-slate-900/50 border-slate-700"
                    {...form.register('email')}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                发送重置链接
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                想起密码了？{' '}
                <Link href="/login" className="text-primary hover:underline">
                  {t('login')}
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </motion.div>
  )
}
