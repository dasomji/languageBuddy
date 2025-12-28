"use client";
import {
  BookOpen,
  Calendar,
  Grid,
  Library,
  Settings,
  PackagePlus,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "~/components/ui/sidebar";
import { LearningSpaceSwitcher } from "./learning-space-switcher";
import { api } from "~/trpc/react";
import { useState, useEffect } from "react";
import { Badge } from "~/components/ui/badge";

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const { data: initialStats } = api.stats.getStats.useQuery();
  const [stats, setStats] = useState(initialStats);

  api.stats.getStatsSubscription.useSubscription(undefined, {
    onData: (data) => {
      setStats(data);
    },
  });

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    }
  }, [initialStats]);

  const navigation = [
    { name: "Dashboard", href: "/", icon: Grid },
    {
      name: "Diary",
      href: "/diary",
      icon: Calendar,
      count: stats?.diaryEntries,
    },
    { name: "VoDex", href: "/vodex", icon: Library, count: stats?.vocabs },
    {
      name: "Add Word packages",
      href: "/vodex/packages",
      icon: PackagePlus,
      count: stats?.wordPackages,
    },
    {
      name: "Stories",
      href: "/stories",
      icon: BookOpen,
      count: stats?.stories,
    },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-col gap-4 border-b p-4">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <h1 className="text-xl font-bold">LanguageBuddy</h1>
        </Link>
        <LearningSpaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <Link
                        href={item.href}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 px-1.5 text-[10px] font-medium"
                          >
                            {item.count}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <p className="text-muted-foreground text-center text-xs">
          Learn languages your way
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
