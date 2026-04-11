import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GPU算力云平台',
  description: '大模型AI云平台，提供GPU算力租赁服务',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster
              position="top-center"
              containerStyle={{ zIndex: 99999 }}
              toastOptions={{
                className: 'bg-background text-foreground border shadow-lg',
                duration: 3000,
                success: {
                  duration: 3000,
                  className: 'bg-background text-foreground border border-green-500 shadow-lg',
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 6000,
                  className: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-2 border-red-500 shadow-xl font-medium',
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
