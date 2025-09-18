import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "src/app/global.css"; // Use @/ alias if tsconfig.json has baseUrl: "src"
import { ThemeProvider } from "src/components/theme-provider";

export const metadata: Metadata = {
  title: "SafetyAI - AI-Powered Safety Detection System",
  description: "Real-time safety equipment detection with seamless system integration for workplace compliance",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}