"use client";

import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { verifyOtp } from "@/app/auth/actions";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  otp: z.string().length(6, { message: "Your OTP must be 6 digits." }),
});

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Verifying..." : "Verify OTP"}
    </Button>
  );
}

export function VerifyOtpForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("otp", values.otp);
    if(email) formData.append("email", email);

    const result = await verifyOtp(formData);

    if (result?.error) {
      toast({
        title: "Error",
        description: <p>{result.error}</p>,
        variant: "destructive",
      });
    } else if (result?.success && result.redirectUrl) {
      window.location.href = result.redirectUrl;
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>One-Time Password</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your 6-digit code"
                  {...field}
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton />
      </form>
    </Form>
  );
}
