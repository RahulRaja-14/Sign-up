import { createClient } from "@/lib/supabase/server";
import { UserNav } from "./user-nav";
import { Logo } from "./auth/logo";
import { redirect } from "next/navigation";

type User = {
  id: string;
  firstName: string;
  email: string;
};

export async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return redirect("/login");
  }

  const { data: userDetails } = await supabase
    .from("user_details")
    .select("first_name")
    .eq("id", authUser.id)
    .single();

  const user: User = {
    id: authUser.id,
    firstName: userDetails?.first_name || "",
    email: authUser.email || "",
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-full">
          <Logo />
          <div className="ml-auto flex items-center gap-4">
            <UserNav user={user} />
          </div>
        </nav>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
