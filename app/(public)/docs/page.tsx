'use client'

import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Code, Server, Database, Shield, Cpu, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const docSections = [
  {
    icon: Server,
    title: '快速入门',
    description: '5分钟上手，了解平台基本使用流程',
    items: ['注册与登录', '创建第一个实例', '连接实例（SSH/JupyterLab）', '上传数据'],
  },
  {
    icon: Cpu,
    title: 'GPU 使用指南',
    description: '充分利用GPU算力进行AI训练和推理',
    items: ['GPU型号选择指南', 'PyTorch 环境配置', 'TensorFlow 环境配置', '多GPU并行训练'],
  },
  {
    icon: Database,
    title: '存储与数据',
    description: '数据上传、存储管理和备份方案',
    items: ['文件存储使用', '数据上传下载', '数据盘管理', '公开数据集使用'],
  },
  {
    icon: Code,
    title: '开发工具',
    description: '开发环境和工具的使用说明',
    items: ['JupyterLab 使用', 'VS Code 远程连接', 'Docker 镜像定制', 'API 接口文档'],
  },
  {
    icon: Shield,
    title: '安全与账号',
    description: '账号安全、密钥管理和权限控制',
    items: ['SSH密钥配置', 'API密钥管理', '两步验证', '子账号管理'],
  },
  {
    icon: BookOpen,
    title: '计费说明',
    description: '了解计费规则和费用管理',
    items: ['计费方式说明', '充值与退款', '账单与发票', '代金券使用'],
  },
]

export default function DocsPage() {
  return (
    <div className="space-y-8 py-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">帮助文档</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          查阅文档快速了解平台功能，解决使用中的各种问题
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docSections.map((section) => (
          <Card key={section.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{section.title}</h3>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item}>
                    <span className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1.5">
                      <ExternalLink className="h-3 w-3" />
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-6 text-center space-y-3">
          <h3 className="font-semibold text-lg">没有找到答案？</h3>
          <p className="text-sm text-muted-foreground">您可以提交工单，我们的技术团队会尽快为您解答</p>
          <Link href="/tickets" className="inline-block">
            <span className="text-sm text-primary hover:underline font-medium">提交工单 →</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
