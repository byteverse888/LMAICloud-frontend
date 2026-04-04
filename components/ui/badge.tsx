import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary/80 dark:bg-primary dark:text-white',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70 dark:bg-secondary/80 dark:text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-white shadow-sm hover:bg-destructive/80 dark:bg-destructive dark:text-white',
        outline:
          'border-border text-foreground hover:bg-muted/50 dark:border-border dark:text-foreground dark:hover:bg-muted/40',
        success:
          'border-transparent bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-500/80 dark:bg-emerald-500/90 dark:text-white',
        warning:
          'border-transparent bg-amber-500 text-white shadow-sm shadow-amber-500/20 hover:bg-amber-500/80 dark:bg-amber-500/90 dark:text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
