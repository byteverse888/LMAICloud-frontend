'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layers } from 'lucide-react'
import SpecPanel from './spec-panel'
import GpuPanel from './gpu-panel'

// 规格定价（合并页）：普通无卡规格 + 显卡定价
export default function AdminSpecPricingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">规格定价</h1>
      </div>

      <Tabs defaultValue="spec">
        <TabsList>
          <TabsTrigger value="spec">普通无卡规格</TabsTrigger>
          <TabsTrigger value="gpu">显卡定价</TabsTrigger>
        </TabsList>
        <TabsContent value="spec" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <SpecPanel />
        </TabsContent>
        <TabsContent value="gpu" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <GpuPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
