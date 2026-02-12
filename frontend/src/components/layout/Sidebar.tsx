"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  FileSearch,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  page: string;
}

const navItems: NavItem[] = [
  { label: "Hub", href: "/", icon: LayoutDashboard, page: "hub" },
  { label: "Chat", href: "/chat", icon: MessageSquare, page: "chat" },
  { label: "Dashboards", href: "/dashboard", icon: BarChart3, page: "dashboard" },
  { label: "Deep Dives", href: "/deep-dives", icon: FileSearch, page: "deep-dives" },
  { label: "Alerts", href: "/alerts", icon: Bell, page: "alerts" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  function isActive(item: NavItem): boolean {
    if (item.href === "/") return pathname === "/";
    return pathname.startsWith(item.href);
  }

  return (
    <motion.nav
      className="bg-background flex flex-col items-center py-4 z-50 relative h-full border-r border-border"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: isHovered ? 180 : 64 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 px-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-foreground">
          <span className="text-background font-bold text-sm">A</span>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full" />
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.span
              className="text-foreground font-semibold text-sm whitespace-nowrap"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              Alex
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* Navigation Items */}
      <div className="flex flex-col gap-1 flex-1 w-full px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.page}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {active && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-foreground rounded-r-full"
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    className={cn(
                      "text-sm whitespace-nowrap",
                      active ? "font-medium" : "font-normal"
                    )}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>

      {/* Settings at bottom */}
      <div className="w-full px-2">
        <Link
          href="/onboarding"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {isHovered && (
              <motion.span
                className="text-sm whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                Setup
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </motion.nav>
  );
}
