"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, Home, Library } from "lucide-react";
import { cn } from "~/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Diary", href: "/diary", icon: Calendar },
  { name: "VoDex", href: "/vodex", icon: Library },
  { name: "Stories", href: "/stories", icon: BookOpen },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-card px-4 py-2 md:hidden">
      {navigation.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== "/" && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 p-2 text-xs font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
