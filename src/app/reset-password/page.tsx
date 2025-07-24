import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Logo } from "@/components/auth/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
     return redirect("/login?error=You must be logged in to reset your password. Please verify the OTP first.");
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle>Set a New Password</CardTitle>
          <CardDescription>
            Please enter and confirm your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
