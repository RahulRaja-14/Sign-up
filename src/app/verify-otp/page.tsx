import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { Logo } from "@/components/auth/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";

function VerifyOtpPageContent() {
    return (
         <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                    <Logo />
                </div>
                <CardTitle>Check your email</CardTitle>
                <CardDescription>
                    We've sent a 6-digit code to your email address. Enter it below to reset your password.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <VerifyOtpForm />
                     <div className="mt-4 text-center">
                        <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Sign In
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}


export default function VerifyOtpPage() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyOtpPageContent />
      </Suspense>
    )
}
