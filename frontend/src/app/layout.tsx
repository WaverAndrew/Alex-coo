import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { FloatingChatBar } from "@/components/layout/FloatingChatBar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alex | Your COO Agent",
  description: "AI-powered business intelligence for Bella Casa Furniture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <TopNav />
        <main className="pt-16">
          {children}
        </main>
        <FloatingChatBar />
      </body>
    </html>
  );
}
