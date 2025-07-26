import {
        Card,
        CardContent,
        CardDescription,
        CardHeader,
        CardTitle,
      } from "@/components/ui/card";
      import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
      import { Logo } from "@/components/auth/logo";
      import Link from "next/link";
      import { ChevronLeft } from "lucide-react";
      
      export default function ForgotPasswordPage() {
        return (
          <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                  <Logo />
                </div>
                <CardTitle>Forgot Your Password?</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a 6-digit code to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ForgotPasswordForm />
                <div className="mt-4 text-center">
                   <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Sign In
                  </Link>
                </div>
              </CardContent>
            </Card>
          </main>
        );
      }