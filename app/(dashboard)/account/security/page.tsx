'use client'

import { useState } from 'react'
import { Shield, Key, Smartphone, Mail, Lock, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

export default function SecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">安全设置</h1>
      </div>

      {/* 安全等级 */}
      <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <div className="text-lg font-semibold">账户安全等级：高</div>
              <div className="text-sm text-muted-foreground">您已开启多项安全保护措施</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 安全项目 */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">登录密码</div>
                  <div className="text-sm text-muted-foreground">用于账号登录，建议定期更换</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  已设置
                </Badge>
                <Button variant="outline" size="sm">修改密码</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">邮箱绑定</div>
                  <div className="text-sm text-muted-foreground">已绑定：us****@example.com</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  已绑定
                </Badge>
                <Button variant="outline" size="sm">更换邮箱</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">手机绑定</div>
                  <div className="text-sm text-muted-foreground">绑定后可用于登录和找回密码</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  未绑定
                </Badge>
                <Button variant="outline" size="sm">立即绑定</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">两步验证</div>
                  <div className="text-sm text-muted-foreground">开启后登录时需要输入验证码</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                <span className="text-sm text-muted-foreground">{twoFactorEnabled ? '已开启' : '未开启'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
