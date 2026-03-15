'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Bell,
  CreditCard,
  Copy,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useCurrentUser } from '@/hooks/use-api'

export default function AccountPage() {
  const t = useTranslations('account')
  const [copied, setCopied] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  
  const { user, loading, refresh } = useCurrentUser()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">账号设置</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !user ? (
        <div className="text-center py-12 text-muted-foreground">加载失败</div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-full">
          <TabsTrigger value="profile" className="rounded-full px-4">基本信息</TabsTrigger>
          <TabsTrigger value="security" className="rounded-full px-4">安全设置</TabsTrigger>
          <TabsTrigger value="api" className="rounded-full px-4">API 密钥</TabsTrigger>
          <TabsTrigger value="notification" className="rounded-full px-4">通知设置</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="profile">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-lg">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 用户ID */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">用户ID</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">{user.id}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(user.id)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 昵称 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">昵称</Label>
                  <div className="font-medium">{user.nickname}</div>
                </div>
                <Button variant="outline" size="sm">
                  <Edit2 className="h-4 w-4 mr-2" />
                  修改
                </Button>
              </div>

              <Separator />

              {/* 邮箱 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">邮箱</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">已绑定</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm">修改</Button>
              </div>

              <Separator />

              {/* 手机 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">手机号</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone || '未绑定'}</span>
                    {user.phone && <Badge variant="outline" className="text-green-600 border-green-600">已绑定</Badge>}
                  </div>
                </div>
                <Button variant="outline" size="sm">{user.phone ? '修改' : '绑定'}</Button>
              </div>

              <Separator />

              {/* 实名认证 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">实名认证</Label>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {user.verified ? (
                      <Badge className="bg-green-500">已认证</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500">未认证</Badge>
                    )}
                  </div>
                  {!user.verified && (
                    <p className="text-xs text-muted-foreground">完成实名认证可享受更多权益</p>
                  )}
                </div>
                {!user.verified && <Button size="sm">去认证</Button>}
              </div>

              <Separator />

              {/* 注册时间 */}
              <div className="space-y-1">
                <Label className="text-muted-foreground">注册时间</Label>
                <div className="text-sm">{user.created_at}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-lg">安全设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 登录密码 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">登录密码</span>
                  </div>
                  <p className="text-sm text-muted-foreground">定期更换密码可以提高账号安全性</p>
                </div>
                <Button variant="outline">修改密码</Button>
              </div>

              <Separator />

              {/* 两步验证 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">两步验证</span>
                  </div>
                  <p className="text-sm text-muted-foreground">开启后登录时需要输入验证码</p>
                </div>
                <Button variant="outline">开启</Button>
              </div>

              <Separator />

              {/* 登录记录 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-medium">登录记录</span>
                  <p className="text-sm text-muted-foreground">查看账号的登录历史</p>
                </div>
                <Button variant="outline">查看</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API密钥 */}
        <TabsContent value="api">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-lg">API 密钥</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-lg text-sm">
                请妥善保管您的API密钥，不要泄露给他人。如果密钥泄露，请立即重置。
              </div>

              <div className="space-y-4">
                <Label>当前密钥</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={user.api_key || ''}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(user.api_key || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">重置密钥</Button>
                <Button variant="outline">查看文档</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notification">
          <Card className="card-clean">
            <CardHeader>
              <CardTitle className="text-lg">通知设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'balance', title: '余额预警', desc: '当余额低于阈值时发送通知' },
                { key: 'expiry', title: '到期提醒', desc: '实例即将到期时发送通知' },
                { key: 'release', title: '释放提醒', desc: '实例即将被释放时发送通知' },
                { key: 'promotion', title: '优惠活动', desc: '接收平台优惠活动通知' },
                { key: 'system', title: '系统通知', desc: '接收平台公告和系统消息' },
              ].map((item, index) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{item.title}</div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked className="rounded" />
                        站内信
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked className="rounded" />
                        邮件
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        短信
                      </label>
                    </div>
                  </div>
                  {index < 4 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  )
}
