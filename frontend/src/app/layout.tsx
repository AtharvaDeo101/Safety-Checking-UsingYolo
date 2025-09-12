import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "src/app/globals.css"; // Adjust path if globals.css is elsewhere (e.g., "src/app/globals.css")

export const metadata: Metadata = {
  title: "SafetyAI - AI-Powered Safety Detection System",
  description: "Real-time safety equipment detection with seamless system integration for workplace compliance",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>{children}</body>
    </html>
  )
}
