'use client'

import { useMarketProducts } from '@/hooks/use-api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Bot, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AIAppsPage() {
  const { products, loading } = useMarketProducts('ai_app')

  return (
    <div className="space-y-8 py-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">AI 应用</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          开箱即用的 AI 应用，涵盖图像生成、自然语言处理、语音识别等多个领域
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">AI 应用即将上线，敬请期待</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: any) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {product.icon ? (
                      <img src={product.icon} alt="" className="h-8 w-8 rounded" />
                    ) : (
                      <Bot className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                  </div>
                </div>
                {product.specs && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(product.specs).slice(0, 3).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-xs">{k}: {String(v)}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  {product.price > 0 ? (
                    <span className="text-lg font-bold text-primary">¥{product.price}<span className="text-xs text-muted-foreground font-normal">/月</span></span>
                  ) : (
                    <Badge variant="success">免费</Badge>
                  )}
                  <Button size="sm" className="gap-1">
                    立即使用 <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
