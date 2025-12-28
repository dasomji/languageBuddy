import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/sidebar/sidebar";
import { HeaderProvider } from "~/components/dashboard-header-context";
import { DashboardHeaderContent } from "~/components/dashboard-header-content";
import { ChatProviderWrapper } from "~/components/chat/chat-provider-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <HeaderProvider>
      <ChatProviderWrapper>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="bg-background sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
              <SidebarTrigger />
              <div className="flex flex-1 items-center gap-2">
                <DashboardHeaderContent fallback={
                  <h2 className="text-muted-foreground text-sm font-semibold md:hidden">
                    LanguageBuddy
                  </h2>
                } />
              </div>
            </header>
            <main className="flex flex-1 flex-col min-h-0">
              <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col min-h-0 px-4 py-6 md:px-8 md:py-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ChatProviderWrapper>
    </HeaderProvider>
  );
}
