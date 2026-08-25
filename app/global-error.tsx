'use client'

// 根级错误边界：根 layout 自身崩溃时接管，必须自带 <html>/<body>。
// 不依赖项目组件库与全局样式（它们可能正是崩溃源），纯内联样式保底渲染
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b0f1a', color: '#e2e8f0' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>应用出现异常</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0, maxWidth: 480 }}>
            {error.message || '页面无法正常渲染，请刷新重试'}
          </p>
          <button
            onClick={reset}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14, cursor: 'pointer' }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  )
}
