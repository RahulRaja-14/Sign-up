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
  const origin = headers().get("origin");
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
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        dob: dob,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // Check if the user already existed.
  // The user object is not null, but the identities array is empty.
  // This indicates that the user exists, but a new user was not created.
  if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
    return { error: "An account with this email already exists. Please try logging in or reset your password." };
  }
  
  return redirect(`/login?message=Check your email to continue`);
}


export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

export async function forgotPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const supabase = createClient();

    // To avoid email enumeration, we'll always return a success message,
    // whether the user exists or not.
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${headers().get('origin')}/auth/callback?next=/reset-password`
    });

    if (error) {
        // Log the error for debugging but don't expose it to the user.
        console.error("Forgot Password Error:", error.message);
    }
    
    // Always redirect to the verify-otp page with the email.
    // The page itself will inform the user to check their inbox.
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

    return redirect("/dashboard");
}
