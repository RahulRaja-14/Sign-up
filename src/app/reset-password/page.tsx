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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { message?: string, error?: string };
}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // This check is important. It ensures that only users who have
  // successfully verified an OTP (by clicking the link) can access this page.
  if (!session) {
     return redirect("/login?error=Invalid or expired password reset link. Please try again.");
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
          {searchParams.message && (
             <Alert className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>
                {searchParams.message}
              </AlertDescription>
            </Alert>
          )}
           {searchParams.error && (
             <Alert variant="destructive" className="mb-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {searchParams.error}
              </AlertDescription>
            </Alert>
          )}
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
