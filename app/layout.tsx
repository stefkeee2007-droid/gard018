import type React from "react"
import type { Metadata } from "next"
import { Inter, Oswald } from "next/font/google"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"

const _inter = Inter({ subsets: ["latin"] })
const _oswald = Oswald({ subsets: ["latin"], variable: "--font-heading" })

export const metadata: Metadata = {
  title: "Borilački klub GARD 018 | Boks, Kik Boks, Muay Thai",
  description:
    "Profesionalni borilački klub u Nišu. Treninzi boksa, kik boksa i muay thai-a za sve uzraste i nivoe. Pridruži se porodici šampiona.",
  generator: "v0.app",
  keywords: ["boks", "kik boks", "muay thai", "Niš", "borilačke veštine", "trening", "Srbija", "GARD 018"],
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
