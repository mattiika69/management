import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import { AuthRecoveryBridge } from "@/components/auth-recovery-bridge";
import { AppChrome } from "@/components/app-chrome";
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
        <AuthRecoveryBridge />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
