'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

type ActivationStatus = 'loading' | 'success' | 'already_activated' | 'error'

export default function ActivatePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<ActivationStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('无效的激活链接')
      return
    }

    const activateEmail = async () => {
      try {
        const response = await api.post<{ already_activated?: boolean; activated?: boolean }>('/auth/activate', { token })
        
        if (response.data.already_activated) {
          setStatus('already_activated')
        } else {
          setStatus('success')
        }
      } catch (error: any) {
        setStatus('error')
        setErrorMessage(error.response?.data?.detail || '激活失败，请重试')
      }
    }

    activateEmail()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="card-clean shadow-lg">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">
                  正在激活...
                </CardTitle>
                <CardDescription className="text-base">
                  请稍候，正在验证您的邮箱
                </CardDescription>
              </CardHeader>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
                  激活成功！
                </CardTitle>
                <CardDescription className="text-base">
                  您的邮箱已成功验证
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  现在您可以使用邮箱和密码登录平台了
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/login" className="w-full">
                  <Button className="w-full h-11 text-base rounded-lg">
                    立即登录
                  </Button>
                </Link>
              </CardFooter>
            </>
          )}

          {/* Already Activated State */}
          {status === 'already_activated' && (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-primary">
                  邮箱已激活
                </CardTitle>
                <CardDescription className="text-base">
                  您的邮箱已经激活过了，无需重复操作
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  请直接使用邮箱和密码登录
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/login" className="w-full">
                  <Button className="w-full h-11 text-base rounded-lg">
                    前往登录
                  </Button>
                </Link>
              </CardFooter>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-destructive">
                  激活失败
                </CardTitle>
                <CardDescription className="text-base">
                  {errorMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-muted-foreground text-sm">
                  激活链接可能已过期或无效
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    如果您需要重新获取激活邮件，请：
                  </p>
                  <ol className="text-sm text-muted-foreground mt-2 space-y-1 text-left list-decimal list-inside">
                    <li>前往注册页面</li>
                    <li>使用相同邮箱重新注册</li>
                    <li>系统会重新发送激活邮件</li>
                  </ol>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Link href="/register" className="w-full">
                  <Button variant="outline" className="w-full">
                    重新注册
                  </Button>
                </Link>
                <Link href="/login" className="w-full">
                  <Button className="w-full h-11 text-base rounded-lg">
                    返回登录
                  </Button>
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
