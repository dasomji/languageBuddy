import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { Sidebar } from "~/components/sidebar/sidebar";
import { MobileNav } from "~/components/sidebar/mobile-nav";
import { TRPCReactProvider } from "~/trpc/react";

export default async function AppLayout({
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
    <TRPCReactProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="md:pl-64">
          <div className="mx-auto max-w-7xl px-4 py-6 pb-20 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </TRPCReactProvider>
  );
}
