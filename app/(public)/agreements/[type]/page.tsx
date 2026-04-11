'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const titleMap: Record<string, string> = {
  user: '用户协议',
  privacy: '隐私政策',
  service: '产品服务协议',
  recharge: '用户充值协议',
}

export default function AgreementPage() {
  const params = useParams()
  const type = params.type as string
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!titleMap[type]) {
      setContent('协议类型不存在')
      setLoading(false)
      return
    }
    // 从前端静态文件读取协议内容
    fetch(`/agreements/${type}.html`)
      .then(res => res.ok ? res.text() : Promise.reject('Not found'))
      .then(html => setContent(html))
      .catch(() => setContent('暂无内容'))
      .finally(() => setLoading(false))
  }, [type])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{titleMap[type] || '协议'}</h1>
      <Card>
        <CardContent className="p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
