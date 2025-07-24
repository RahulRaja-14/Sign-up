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
  
  // Supabase's signUp returns a user object if the user already exists, 
  // but with an empty identities array if email confirmation is on.
  // We first try to sign them up.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  
  if (signUpError) {
    return { error: signUpError.message };
  }

  // If a user is returned, but their identities are empty, it means they already exist
  // but may not have confirmed their email.
  if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
    return { error: "An account with this email already exists. Please try logging in or reset your password." };
  }
  
  if (signUpData.user) {
    const { error: insertError } = await supabase.from('user_details').insert({
      id: signUpData.user.id,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      dob: dob
    });

    if (insertError) {
      // Potentially delete the auth user if the profile insert fails
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return { error: `Could not create user profile: ${insertError.message}` };
    }
  }

  return { error: null };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

export async function forgotPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const supabase = createClient();

    // The most reliable way to check for a user without admin rights is to see
    // if a password reset request succeeds. Supabase will not send an email
    // if the user does not exist, but it won't return an error for security reasons.
    // For a better user experience, we have to accept this limitation.
    // The previous implementation using admin rights was incorrect.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${headers().get('origin')}/auth/callback?next=/reset-password`
    });

    if (error) {
        // This error is often generic to prevent email enumeration, 
        // but we can show it if something else goes wrong.
        return { error: error.message, success: false };
    }

    // We can't definitively know if the user exists, but the action was initiated.
    return { error: null, success: true };
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
