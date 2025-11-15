import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import type { NextFontWithVariable } from "next/dist/compiled/@next/font";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Provider } from "jotai";

const geistSans: NextFontWithVariable = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono: NextFontWithVariable = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_NAME = "Chainly";
const APP_DESCRIPTION =
  "Build powerful workflow automations. Connect your favorite tools and automate repetitive tasks with an intuitive visual workflow builder.";
const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL || "https://chainly.vercel.app";
const APP_CREATOR = "Théo EwzZer";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: APP_CREATOR }],
  keywords: [
    "workflow automation",
    "no-code automation",
    "AI workflows",
    "workflow builder",
    "automation tools",
    "business automation",
    "process automation",
    "integration platform",
  ],
  creator: APP_CREATOR,
  publisher: APP_CREATOR,
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: "/logos/logo.svg",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} - Workflow Automation Platform`,
      },
    ],
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
  icons: {
    icon: [{ url: "/logos/logo.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactNode {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCReactProvider>
          <NuqsAdapter>
            <Provider>{children}</Provider>
          </NuqsAdapter>
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
