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
    return { error: error.message };
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
      email_confirm: false, // This is the key change to disable confirmation email
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        dob: dob,
        email: email, // Pass email to metadata for the trigger
      },
    },
  });

  if (signUpError) {
    // This will catch unique constraint violations for existing emails.
    if (signUpError.message.includes('unique constraint')) {
        return { error: "An account with this email already exists. Please try logging in." };
    }
    return { error: signUpError.message };
  }
  
  // If signup is successful and we have a user, redirect to dashboard.
  if (signUpData.user) {
    // The welcome email is sent automatically by Supabase because email_confirm is false.
    // The user is also automatically signed in.
    return redirect("/dashboard");
  }

  // Fallback redirect if something unexpected happens.
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
    
    // We call this unconditionally to prevent email enumeration.
    // Supabase will not send an email if the user does not exist.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${headers().get('origin')}/auth/callback?next=/reset-password`
    });

    if (error) {
        // Log the error for debugging but don't expose it to the user.
        console.error("Forgot Password Error:", error.message);
    }
    
    // Always redirect to the verify page, even if there's an error.
    // The page itself will inform the user what to do next.
    return redirect(`/verify-otp?email=${email}`);
}

export async function verifyOtp(formData: FormData) {
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string;
    const supabase = createClient();

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
    });

    if (error) {
        return { error: error.message, success: false };
    }
    
    // This will sign the user in, allowing them to reset their password.
    if (data.session) {
        await supabase.auth.setSession(data.session);
    } else {
        // This case can happen if the OTP is correct but there's no session to create.
        // It's an edge case but worth handling.
        return { error: 'Could not verify OTP.', success: false };
    }

    return { error: null, success: true };
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
