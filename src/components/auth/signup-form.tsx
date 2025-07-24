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
import { signup } from "@/app/auth/actions";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { redirect } from "next/navigation";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  countryCode: z.string().min(1, { message: "Country code is required." }),
  phone: z.string().regex(phoneRegex, 'Invalid Number!'),
  dob: z.date({ required_error: "Date of birth is required." }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ['confirmPassword']
});

export function SignUpForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      countryCode: "+1",
      phone: "",
      password: "",
      confirmPassword: ""
    },
  });

  const passwordValidation = [
      { rule: /.{8,}/, text: "Minimum 8 characters" },
      { rule: /[A-Z]/, text: "At least one uppercase letter" },
      { rule: /[a-z]/, text: "At least one lowercase letter" },
      { rule: /[0-9]/, text: "At least one number" },
      { rule: /[^a-zA-Z0-9]/, text: "At least one special character" },
  ];

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value instanceof Date) {
        formData.append(key, value.toISOString().split('T')[0]);
      } else if (key === 'phone' || key === 'countryCode') {
        if (key === 'phone') {
            formData.append('phone', `${values.countryCode} ${values.phone}`)
        }
      } else if (key !== 'confirmPassword') {
        formData.append(key, value);
      }
    });

    const result = await signup(formData);

    if (result?.error) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: result.error,
      });
      setIsSubmitting(false);
    } 
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <div className="flex gap-2">
                <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                        <FormItem className="w-24">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Code" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="+1">+1 (USA)</SelectItem>
                                    <SelectItem value="+44">+44 (UK)</SelectItem>
                                    <SelectItem value="+91">+91 (India)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormControl>
                        <Input placeholder="123 456 7890" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </FormItem>
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      captionLayout="dropdown-buttons"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                 <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                    <Button variant="ghost" size="icon" type="button" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                 </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 text-xs">
            {passwordValidation.map(({ rule, text }) => (
                <div key={text} className={cn("text-muted-foreground", { "text-primary": rule.test(form.watch("password")) })}>
                    {text}
                </div>
            ))}
        </div>
        <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <Button variant="ghost" size="icon" type="button" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <EyeOff /> : <Eye />}
                            </Button>
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign Up
        </Button>
      </form>
    </Form>
  );
}
