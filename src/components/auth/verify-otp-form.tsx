"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { verifyOtp } from "@/app/auth/actions";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const formSchema = z.object({
  otp: z.string().min(6, { message: "Your one-time password must be 6 characters." }),
});

export function VerifyOtpForm({ email: emailFromProps }: { email: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState(emailFromProps);

  useEffect(() => {
    // Fallback to localStorage if prop/param is not available on mount
    if (!email) {
      const storedEmail = localStorage.getItem("reset_email");
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not find email for verification. Please start over.",
        });
        router.push("/forgot-password");
      }
    }
  }, [email, router, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email is missing. Please start the process again.",
      });
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("email", email);
    formData.append("otp", values.otp);

    const result = await verifyOtp(formData);

    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
       // On success, the action redirects.
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>One-Time Password</FormLabel>
              <FormControl>
                <Input 
                  placeholder="123456" 
                  {...field} 
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || !email}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify Code
        </Button>
      </form>
    </Form>
  );
}
