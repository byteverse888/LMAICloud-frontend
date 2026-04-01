'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Server, Cpu, Zap, Shield, Clock, Headphones } from 'lucide-react'
import Link from 'next/link'

const servers = [
  {
    name: 'GPU 云服务器',
    description: '搭载最新 NVIDIA GPU，为深度学习和 AI 推理提供澎湃算力',
    icon: Cpu,
    features: ['RTX 4090/5090', 'A100/H100', 'NVLink 高速互联', '按需弹性扩缩'],
    badge: '热门',
  },
  {
    name: '高性能计算服务器',
    description: '面向科学计算、仿真模拟、基因测序等大规模并行计算场景',
    icon: Server,
    features: ['多GPU并行', '高带宽RDMA网络', '大容量存储', '专业技术支持'],
    badge: '',
  },
  {
    name: 'AI 推理服务器',
    description: '针对模型推理优化，低延迟高吞吐，适合在线服务部署',
    icon: Zap,
    features: ['推理加速引擎', '自动扩缩容', '低至毫秒延迟', '99.99% SLA'],
    badge: '推荐',
  },
]

const advantages = [
  { icon: Cpu, title: '顶级算力', desc: '最新 NVIDIA GPU 芯片，算力充沛' },
  { icon: Shield, title: '安全可靠', desc: '数据加密存储，多重安全防护' },
  { icon: Clock, title: '秒级交付', desc: '即开即用，无需等待部署' },
  { icon: Headphones, title: '专业服务', desc: '7×24 小时技术支持' },
]

export default function AIServersPage() {
  return (
    <div className="space-y-12 py-8">
      {/* 头部 */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">AI 服务器</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          为 AI 训练和推理量身打造的高性能 GPU 服务器，让您的 AI 项目如虎添翼
        </p>
        <Link href="/market/list">
          <Button size="lg" className="mt-4">立即选购</Button>
        </Link>
      </div>

      {/* 服务器类型 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {servers.map((s) => (
          <Card key={s.name} className="hover:shadow-lg transition-shadow relative">
            {s.badge && (
              <Badge className="absolute -top-2 -right-2 bg-primary">{s.badge}</Badge>
            )}
            <CardContent className="p-6 space-y-4">
              <s.icon className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">{s.name}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              <ul className="space-y-2">
                {s.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/market/list">
                <Button variant="outline" className="w-full mt-2">了解更多</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 优势 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {advantages.map((a) => (
          <div key={a.title} className="text-center space-y-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <a.icon className="h-7 w-7 text-primary" />
            </div>
            <h4 className="font-semibold">{a.title}</h4>
            <p className="text-sm text-muted-foreground">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
