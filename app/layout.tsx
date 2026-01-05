import type React from "react"
import type { Metadata } from "next"
import { Inter, Oswald } from "next/font/google"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"

const _inter = Inter({ subsets: ["latin"] })
const _oswald = Oswald({ subsets: ["latin"], variable: "--font-heading" })

export const metadata: Metadata = {
  title: "GARD 018 | Boks Klub Niš | Kik Boks | Muay Thai | Borilački Klub",
  description:
    "GARD 018 - Profesionalni boks i kik boks klub u Nišu. Treninzi boksa, kik boksa, muay thai-a, tajlandskog boksa. Grupni i individualni treninzi za dece, omladinu i odrasle. Licencirani treneri.",
  generator: "v0.app",
  keywords: [
    "gard018",
    "gard 018",
    "boks",
    "kik boks",
    "kikboks",
    "muay thai",
    "tajlandski boks",
    "boks klub nis",
    "kik boks klub nis",
    "borilacki klub nis",
    "boks trening nis",
    "borilacke vestine nis",
    "treninzi boksa",
    "treninzi kik boksa",
    "boks za decu nis",
    "kik boks za pocetnike",
    "borilacki sportovi nis",
    "teretana nis",
    "fitnes boks",
    "kickboxing nis",
    "boxing club nis",
    "martial arts nis",
    "boks skola nis",
    "kik boks skola",
    "samoodbrana nis",
    "kondicioni trening",
    "licencirani treneri",
    "profesionalni boks",
    "Srbija",
    "Niš",
  ],
  metadataBase: new URL("https://gard018.com"),
  alternates: {
    canonical: "https://gard018.com",
  },
  openGraph: {
    type: "website",
    locale: "sr_RS",
    url: "https://gard018.com",
    title: "GARD 018 - Boks i Kik Boks Klub u Nišu",
    description:
      "Profesionalni boks i kik boks treninzi u Nišu. Muay thai, tajlandski boks, grupni i individualni treninzi. Pridruži se GARD 018 porodici.",
    siteName: "GARD 018",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "GARD 018 - Boks i Kik Boks Klub u Nišu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GARD 018 - Boks i Kik Boks Klub u Nišu",
    description: "Profesionalni boks i kik boks treninzi. Muay thai, tajlandski boks. Grupni i individualni treninzi.",
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
