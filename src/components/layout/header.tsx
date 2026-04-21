"use client";

import { Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, User } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { PeriodPicker } from "./period-picker";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card/80 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="lg:hidden" />}
        >
          <Menu className="h-6 w-6" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MobileSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />}>
            <PeriodPicker />
          </Suspense>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" className="flex items-center gap-2" />}
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-8 w-8 rounded-full ring-2 ring-primary/20"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="hidden text-sm font-semibold sm:inline">
                  {session.user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
