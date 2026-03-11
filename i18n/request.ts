import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headersList = await headers()
  
  // 优先从 cookie 获取语言设置
  let locale = cookieStore.get('locale')?.value
  
  // 如果没有 cookie，从 Accept-Language 头获取
  if (!locale) {
    const acceptLanguage = headersList.get('Accept-Language')
    if (acceptLanguage?.includes('zh')) {
      locale = 'zh'
    } else {
      locale = 'en'
    }
  }
  
  // 确保 locale 是支持的语言
  if (!['zh', 'en'].includes(locale)) {
    locale = 'zh'
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
