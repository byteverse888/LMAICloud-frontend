import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // 浅色：深蓝底白字；深色：亮蓝底白字，hover 加亮
        default: 'bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 dark:bg-primary dark:text-white dark:hover:bg-primary/80 dark:shadow-primary/35',
        // 红色破坏性操作
        destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90 dark:bg-destructive dark:text-white dark:hover:bg-destructive/80',
        // 描边按钮：浅色清晰边框+hover淡蓝；深色加深边框避免消失
        outline: 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/40 dark:border-border dark:bg-transparent dark:text-foreground dark:hover:bg-muted dark:hover:border-primary/60',
        // 次级：浅色灰底深字；深色稍亮灰底
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/60',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-muted/60',
        link: 'text-primary underline-offset-4 hover:underline',
        gradient: 'bg-gradient-to-r from-primary to-sky-400 text-white font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:brightness-105 dark:shadow-primary/30',
        success: 'bg-green-600 text-white shadow-sm hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-lg px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
