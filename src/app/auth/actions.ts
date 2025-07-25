"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

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

  // First, check if the user already exists in auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
      return { error: "Could not verify user. Please try again." };
  }
  
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
      return { error: "An account with this email already exists. Please try logging in." };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${headers().get('origin')}/auth/callback`,
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
    return { error: signUpError.message };
  }
  
  if (signUpData.user) {
    // Manually insert into user_details table
    const { error: insertError } = await supabase.from('user_details').insert({
        id: signUpData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        dob: dob,
        email: email,
    });
    
    if (insertError) {
        // If profile creation fails, delete the user to allow them to try again.
        await supabase.auth.admin.deleteUser(signUpData.user.id);
        return { error: "Could not create user profile. Please try again." };
    }
      
    // Redirect to login with a success message, prompting email verification.
    return redirect(`/login?message=Account created. Please check your email to confirm your account and sign in.`);
  }

  return redirect(`/login?message=Something went wrong. Please try again.`);
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
    redirectTo: `${headers().get('origin')}/reset-password`,
  });

  if (error) {
    console.error("Forgot Password Error:", error);
    return { error: "Could not send password reset email. Please try again." };
  }

  return redirect(`/login?message=Password reset link has been sent to your email.`);
}


export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        console.error("Password Reset Error:", error.message);
        return redirect(`/reset-password?error=Could not update password. Please try again.`);
    }

    // After updating, sign the user out to force a new login
    await supabase.auth.signOut();
    return redirect("/login?message=Your password has been reset successfully. Please sign in.");
}
