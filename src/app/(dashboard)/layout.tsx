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
import { WaitlistMessage } from "~/components/waitlist-message";

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

  // Check if user is on waitlist
  // Admins bypass the waitlist check
  const isWaitlisted =
    session.user.waitlist === true && session.user.role !== "admin";

  if (isWaitlisted) {
    return (
      <WaitlistMessage
        userName={session.user.name}
        userEmail={session.user.email}
      />
    );
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
                <DashboardHeaderContent
                  fallback={
                    <h2 className="text-muted-foreground text-sm font-semibold md:hidden">
                      LanguageBuddy
                    </h2>
                  }
                />
              </div>
            </header>
            <main className="flex min-h-0 flex-1 flex-col">
              <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-8 md:py-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ChatProviderWrapper>
    </HeaderProvider>
  );
}
