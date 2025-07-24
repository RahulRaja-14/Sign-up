import { DashboardLayout } from "@/components/dashboard-layout";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-8">
          Welcome to Plamento! 🎉
        </h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 w-full max-w-xl">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="h-40 bg-card/50 border-dashed border-2 hover:border-primary/50 transition-colors duration-300" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
