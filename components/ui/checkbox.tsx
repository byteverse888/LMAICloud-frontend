"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // 基础：白色背景 + 清晰边框，提升浅色模式下的可见度
      "peer h-4 w-4 shrink-0 rounded-sm border-2 border-primary/60 bg-white",
      "ring-offset-background transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // 选中态：主色背景 + 白色勾（浅色/深色模式均适用）
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white",
      // 悬停：边框加深
      "hover:border-primary",
      // 深色模式：明显背景 + 更亮边框，确保未选中时也清晰可见
      "dark:bg-muted dark:border-primary/70",
      "dark:hover:border-primary dark:hover:bg-muted/80",
      "dark:data-[state=checked]:bg-primary dark:data-[state=checked]:border-primary dark:data-[state=checked]:text-white",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-3.5 w-3.5 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
