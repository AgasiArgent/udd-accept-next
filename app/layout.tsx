import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notes",
  description: "A tiny notes app",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The feedback widget is loaded only for a signed-in user.
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        {user ? <Script src="/widget.js" data-endpoint="/api/feedback" strategy="afterInteractive" /> : null}
      </body>
    </html>
  );
}
