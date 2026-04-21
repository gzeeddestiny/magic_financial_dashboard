"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  Receipt,
  Upload,
  TrendingUp,
} from "lucide-react";

const navigation = [
  {
    name: "Executive Summary",
    href: "/executive",
    icon: LayoutDashboard,
    description: "ภาพรวมการเงิน",
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderKanban,
    description: "กำไรรายโปรเจกต์",
  },
  {
    name: "Cash Flow",
    href: "/cashflow",
    icon: Wallet,
    description: "กระแสเงินสด",
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: Receipt,
    description: "ชำแหละรายจ่าย",
  },
];

const secondaryNav = [
  {
    name: "อัปโหลดสลิป",
    href: "/expenses/upload",
    icon: Upload,
  },
];

export function MobileSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-sidebar px-5 pb-4 pt-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            MAGIC <span className="text-primary">Finance</span>
          </h1>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Digital Agency
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col gap-y-6">
        <div>
          <p className="px-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            Analytics
          </p>
          <ul className="flex flex-col gap-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-x-3 rounded-xl px-3 py-3 text-base font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/60 group-hover:text-foreground"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      {item.description && (
                        <span
                          className={cn(
                            "text-xs font-normal transition-colors",
                            isActive
                              ? "text-primary/60"
                              : "text-muted-foreground/40"
                          )}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Secondary Nav */}
        <div>
          <p className="px-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            Actions
          </p>
          <ul className="flex flex-col gap-y-1">
            {secondaryNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-x-3 rounded-xl px-3 py-3 text-base font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground/60 group-hover:text-foreground" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Version footer */}
      <div className="px-2">
        <div className="rounded-xl bg-accent/50 p-3">
          <p className="text-xs text-muted-foreground">
            MAGIC Agency Finance v0.1
          </p>
        </div>
      </div>
    </div>
  );
}
