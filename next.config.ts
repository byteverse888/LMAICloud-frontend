import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

// 直连 Next.js（开发调试 http://IP:3000，不走 nginx）时，由 Next.js 自己把 /gpucloudapi/ 反代到后端，
// 与 nginx 的 location /gpucloudapi/ 等效；走域名/nginx 时这段不影响（nginx 已代理）。
// 注意：rewrites 只代理 HTTP，不代理 WebSocket（终端/日志/实时状态）；直连 3000 要测 WS 请走域名(nginx)。
// 后端不在本机时，启动前设系统环境变量 BACKEND_ORIGIN（如 http://115.190.180.194:8000）覆盖默认值。
const API_BACKEND = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8000'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/gpucloudapi/:path*',
        destination: `${API_BACKEND}/:path*`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
