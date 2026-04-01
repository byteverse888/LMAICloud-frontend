'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Cloud, Lock, Settings, BarChart3, Server, Users } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Cloud,
    title: '专属算力资源',
    description: '独享GPU集群，资源完全隔离，保障您的训练任务不受干扰',
  },
  {
    icon: Lock,
    title: '数据安全可控',
    description: '数据存储在您的专属环境中，支持VPN互联，满足合规要求',
  },
  {
    icon: Settings,
    title: '灵活定制配置',
    description: '根据业务需求灵活配置GPU型号、数量和存储规格',
  },
  {
    icon: BarChart3,
    title: '智能运维管理',
    description: '提供完善的监控、告警和运维工具，降低管理成本',
  },
  {
    icon: Server,
    title: '高可用架构',
    description: '多副本冗余设计，自动故障转移，保障服务连续性',
  },
  {
    icon: Users,
    title: '专业技术团队',
    description: '资深GPU云计算专家团队提供一对一的技术支持和咨询服务',
  },
]

export default function PrivateCloudPage() {
  return (
    <div className="space-y-12 py-8">
      {/* Hero区域 */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">私有云</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          为企业量身打造的 GPU 私有云解决方案，兼顾性能与安全
        </p>
        <div className="flex gap-4 justify-center mt-6">
          <Link href="/tickets">
            <Button size="lg">申请试用</Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline">了解详情</Button>
          </Link>
        </div>
      </div>

      {/* 功能特点 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <Card key={f.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">准备好开始了吗？</h2>
          <p className="text-muted-foreground">联系我们的专家团队，获取定制化私有云方案</p>
          <Link href="/tickets">
            <Button size="lg">联系我们</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
