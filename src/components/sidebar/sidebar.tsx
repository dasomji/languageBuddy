"use client";
import { BookOpen, Calendar, Grid, Library, Settings } from "lucide-react";
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
  { name: "Stories", href: "/stories", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="border-b flex flex-col gap-4 p-4">
        <Link 
          href="/" 
          className="flex items-center gap-2 cursor-pointer"
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
                const isActive = pathname === item.href || 
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
        <p className="text-xs text-muted-foreground text-center">
          Learn languages your way
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
