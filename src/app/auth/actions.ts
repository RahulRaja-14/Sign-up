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

  // Check if user already exists in auth.users
  const { data: { users }, error: existingUserError } = await supabase.auth.admin.listUsers({
      email: email,
  });

  if (existingUserError) {
    // This is an unexpected error.
    return { error: "Could not check for existing user. Please try again." };
  }
  
  if (users && users.length > 0) {
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

    // 1. Check if the user exists
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({ email });

    if (userError || !users || users.length === 0) {
        return { error: "This email is not registered. Please sign up." };
    }
    
    // 2. If user exists, send the OTP
    const { error: otpError } = await supabase.auth.resetPasswordForEmail(email, {
        // This will send an OTP to the user's email
    });

    if (otpError) {
        return { error: "Could not send OTP. Please try again." };
    }

    // 3. Redirect to the verify-otp page
    return redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string;
    const supabase = createClient();

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
    });

    if (error) {
        return { error: "Invalid or expired OTP. Please try again." };
    }
    
    if (data.session) {
       return { success: true };
    }
    
    return { error: "Could not verify OTP. Please request a new one." };
}

export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return { error: "Could not update password. Please try again." };
    }

    return redirect("/login?message=Your password has been reset successfully. Please sign in.");
}
