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
  metadataBase: new URL("https://gard018.com"),
  openGraph: {
    type: "website",
    locale: "sr_RS",
    url: "https://gard018.com",
    title: "Borilački klub GARD 018 | Boks, Kik Boks, Muay Thai",
    description:
      "Profesionalni borilački klub u Nišu. Treninzi boksa, kik boksa i muay thai-a za sve uzraste i nivoe. Pridruži se porodici šampiona.",
    siteName: "GARD 018",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "GARD 018 - Borilački klub u Nišu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Borilački klub GARD 018 | Boks, Kik Boks, Muay Thai",
    description: "Profesionalni borilački klub u Nišu. Treninzi boksa, kik boksa i muay thai-a za sve uzraste i nivoe.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
