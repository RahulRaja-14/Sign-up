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
import { Suspense } from "react";

async function ResetPasswordContent({ message, error } : { message?: string, error?: string }) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
  
    // This page should only be accessible if the user has a valid session
    // which they get after verifying the OTP.
    if (!session) {
       return redirect("/login?error=Invalid session. Please try the password reset process again.");
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
            {message && (
               <Alert className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
            )}
             {error && (
               <Alert variant="destructive" className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </main>
    );
}


export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { message?: string, error?: string };
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent message={searchParams.message} error={searchParams.error} />
    </Suspense>
  )
}
