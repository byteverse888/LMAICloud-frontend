// 404 兜底页：未匹配路由不再走 Next.js 默认页
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-8">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Compass className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">页面不存在</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        您访问的页面不存在或已被移除
      </p>
      <Button asChild>
        <Link href="/instances">返回实例列表</Link>
      </Button>
    </div>
  )
}
