"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Hub", href: "/" },
  { label: "Chat", href: "/chat" },
  { label: "Dashboards", href: "/dashboard" },
  { label: "Deep Dives", href: "/deep-dives" },
  { label: "Alerts", href: "/alerts" },
];

export function TopNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <motion.header
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-background/80 backdrop-blur-xl border border-border/60 rounded-full px-2 py-1.5 shadow-lg shadow-black/5"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-1.5 pl-2 pr-3">
        <span className="relative flex items-center">
          <span className="text-sm font-bold tracking-tight text-foreground">alex</span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1" />
        </span>
      </Link>

      <div className="w-px h-4 bg-border/60" />

      {/* Nav links */}
      <nav className="flex items-center gap-0.5 px-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative px-3 py-1.5 text-[13px] rounded-full transition-colors duration-200",
              isActive(link.href)
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive(link.href) && (
              <motion.div
                className="absolute inset-0 bg-muted rounded-full"
                layoutId="navActive"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="w-px h-4 bg-border/60" />

      {/* Center Alex button — triggers floating chat */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("toggle-alex"))}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors ml-1"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Ask
      </button>
    </motion.header>
  );
}
