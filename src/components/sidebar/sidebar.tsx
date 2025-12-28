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

const navigation = [
  { name: "Dashboard", href: "/", icon: Grid },
  { name: "Diary", href: "/diary", icon: Calendar },
  { name: "VoDex", href: "/vodex", icon: Library },
  { name: "Add Word packages", href: "/vodex/packages", icon: PackagePlus },
  { name: "Stories", href: "/stories", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

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
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
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
