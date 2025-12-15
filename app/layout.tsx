import type React from "react"
import type { Metadata } from "next"
import { Inter, Oswald } from "next/font/google"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"

const _inter = Inter({ subsets: ["latin"] })
const _oswald = Oswald({ subsets: ["latin"], variable: "--font-heading" })

export const metadata: Metadata = {
  title: "Gard 018 | Boksarski i Kik Boksarski Klub Niš",
  description:
    "Profesionalni boksarski i kik boksarski klub u Nišu. Pridruži se našoj porodici šampiona - treninzi za sve uzraste i nivoe.",
  generator: "v0.app",
  keywords: ["boks", "kik boks", "Niš", "borilačke veštine", "trening", "Srbija"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sr">
      <body className={`font-sans antialiased ${_oswald.variable}`}>
        <div className="gradient-bg" />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
