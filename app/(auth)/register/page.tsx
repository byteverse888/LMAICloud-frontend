'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Loader2, Mail, Lock, Check, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth'
import api from '@/lib/api'

interface RegisterResponse {
  need_activation: boolean
}

export default function RegisterPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [isResending, setIsResending] = useState(false)

  const [agreeTerms, setAgreeTerms] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  })

  // 同步 agreeTerms 状态到表单
  const handleAgreeTermsChange = () => {
    const newValue = !agreeTerms
    setAgreeTerms(newValue)
    form.setValue('agreeTerms', newValue, { shouldValidate: true })
  }

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        email: data.email,
        password: data.password,
      })
      
      if (response.data.need_activation) {
        // 需要邮箱激活
        setRegisteredEmail(data.email)
        setRegistrationSuccess(true)
        toast.success('注册成功！请查收激活邮件')
      } else {
        // 不需要激活，直接跳转登录
        toast.success(t('registerSuccess'))
        router.push('/login')
      }
    } catch (error) {
      // Error is already handled in the API client
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendActivation = async () => {
    if (!registeredEmail || isResending) return
    
    setIsResending(true)
    try {
      await api.post('/auth/resend-activation', {
        email: registeredEmail,
      })
      toast.success('激活邮件已重新发送')
    } catch (error) {
      // Error handled in API client
    } finally {
      setIsResending(false)
    }
  }

  // 注册成功后显示激活提示
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
                注册成功！
              </CardTitle>
              <CardDescription className="text-base">
                请查收激活邮件完成验证
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  我们已向以下邮箱发送了激活链接：
                </p>
                <p className="font-medium text-primary">
                  {registeredEmail}
                </p>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>请检查您的收件箱（包括垃圾邮件文件夹）</p>
                <p>激活链接有效期为 24 小时</p>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  没有收到邮件？
                </p>
                <Button
                  variant="outline"
                  onClick={handleResendActivation}
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  重新发送激活邮件
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Link href="/login" className="w-full">
                <Button variant="gradient" className="w-full h-11 text-base">
                  返回登录
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
              <span className="text-2xl font-bold text-primary-foreground">L</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('register')}</CardTitle>
          <CardDescription>
            创建您的 LMAICloud 账号
          </CardDescription>
        </CardHeader>
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
                  className="pl-9"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  className="pl-9"
                  {...form.register('password')}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('confirmPassword')}
                  className="pl-9"
                  {...form.register('confirmPassword')}
                />
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex items-start space-x-2">
              <button
                type="button"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                  agreeTerms
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500 shadow-sm shadow-indigo-500/30'
                    : 'border-gray-300 bg-white dark:bg-transparent dark:border-gray-400 hover:border-indigo-400'
                }`}
                onClick={handleAgreeTermsChange}
              >
                {agreeTerms && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
              </button>
              <span 
                className="text-sm text-muted-foreground cursor-pointer select-none leading-5"
                onClick={handleAgreeTermsChange}
              >
                {t('agreeTerms')}{' '}
                <Link href="/terms" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  {t('termsOfService')}
                </Link>{' '}
                和{' '}
                <Link href="/privacy" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  {t('privacyPolicy')}
                </Link>
              </span>
            </div>
            {form.formState.errors.agreeTerms && (
              <p className="text-sm text-red-500">{form.formState.errors.agreeTerms.message}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              variant="gradient"
              className="w-full h-11 text-base"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('register')}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              {t('hasAccount')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('login')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
        </motion.div>
      </div>
  )
}
