import { DashboardLayout } from "@/components/dashboard-layout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { Cake, Mail, Phone, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type UserDetails = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dob: string;
};

function ProfileDetail({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) {
    return (
        <div className="flex items-center gap-4">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        </div>
    );
}

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: userDetails, error } = await supabase
    .from("user_details")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !userDetails) {
    console.error("Error fetching user details:", error);
    // Redirect or show an error message
    return (
      <DashboardLayout>
        <p>Could not load profile details.</p>
      </DashboardLayout>
    );
  }

  const { first_name, last_name, email, phone, dob } = userDetails as UserDetails;
  const firstLetter = first_name ? first_name.charAt(0).toUpperCase() : "?";

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4 text-4xl">
              <AvatarFallback>{firstLetter}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl">{first_name} {last_name}</CardTitle>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="grid gap-6">
                <ProfileDetail icon={User} label="Full Name" value={`${first_name} ${last_name}`} />
                <ProfileDetail icon={Mail} label="Email Address" value={email} />
                <ProfileDetail icon={Phone} label="Phone Number" value={phone} />
                <ProfileDetail icon={Cake} label="Date of Birth" value={format(new Date(dob), "MMMM d, yyyy")} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
