"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === 'Email not confirmed') {
      return { error: "Email not confirmed. Please check your inbox for a confirmation link." };
    }
    return { error: "Invalid credentials. Please try again." };
  }

  return redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;
  const dob = formData.get("dob") as string;

  const supabase = createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      email_confirm: false,
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        dob: dob,
        email: email, 
      },
    },
  });

  if (signUpError) {
    if (signUpError.message.includes('unique constraint')) {
        return { error: "An account with this email already exists. Please try logging in." };
    }
    return { error: signUpError.message };
  }
  
  if (signUpData.user) {
    // Manually sign in the user after successful sign-up
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return redirect(`/login?message=Account created. Please sign in.`);
    }

    return redirect("/dashboard");
  }

  return redirect(`/login?message=Account created. Please sign in.`);
}


export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

export async function forgotPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const supabase = createClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${headers().get('origin')}/auth/callback?next=/reset-password`
    });

    if (error) {
      // Even if there's an error (e.g., user not found),
      // we don't want to reveal that information.
      // We just log it for debugging.
      console.error("Forgot Password Error:", error.message);
    }
    
    // Always return a success-like message to prevent email enumeration.
    return { error: null };
}


export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return { error: error.message };
    }

    await supabase.auth.signOut();
    return redirect("/login?message=Password reset successfully. Please sign in.");
}
