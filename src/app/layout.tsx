import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import { AppChrome } from "@/components/app-chrome";
import { isAuthBypassEnabled } from "@/lib/supabase/auth-bypass";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HyperOptimal Management",
  description: "HyperOptimal Management workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className={montserrat.className}>
        <AppChrome authBypassEnabled={isAuthBypassEnabled()}>
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
