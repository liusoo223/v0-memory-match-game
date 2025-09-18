import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_KR } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-kr",
})

export const metadata: Metadata = {
  title: "같은 그림 찾기 - Memory Match Game",
  description: "재미있는 메모리 매치 게임으로 기억력을 향상시켜보세요!",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`font-sans ${notoSansKR.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
