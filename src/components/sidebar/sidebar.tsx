"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, Grid, Library } from "lucide-react";
import { cn } from "~/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Grid },
  { name: "Diary", href: "/diary", icon: Calendar },
  { name: "VoDex", href: "/vodex", icon: Library },
  { name: "Stories", href: "/stories", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-card text-card-foreground md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">LanguageBuddy</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Learn languages your way
        </p>
      </div>
    </aside>
  );
}
