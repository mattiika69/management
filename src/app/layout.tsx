import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppChrome } from "@/components/app-chrome";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HyperOptimal Funnel",
  description: "HyperOptimal Funnel workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AppChrome authBypassEnabled={isAuthBypassEnabled()}>
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
