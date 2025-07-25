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
    if (signUpError.message.includes("User already registered")) {
        return { error: "An account with this email already exists. Please try logging in." };
    }
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
  
  // We don't check if the user exists first. This is a security measure to prevent email enumeration.
  // We proceed as if the email might exist.
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // Don't create a new user if they don't exist
    },
  });

  if (otpError) {
      // Supabase might return an error if the email format is invalid or for other reasons.
      // We return a generic error to the user.
      console.error("signInWithOtp error:", otpError);
      return { error: "Could not send password reset email. Please try again." };
  }

  // Redirect to the OTP verification page regardless of whether the email was sent.
  // This is crucial for preventing attackers from knowing which emails are registered.
  return redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}


export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;
  const supabase = createClient();

  // The 'email_otp' type is used for verifying password reset and other email-based OTPs.
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });

  if (error) {
    console.error('OTP Verification Error:', error.message);
    // Provide a more specific error message if possible without compromising security.
    if (error.message.includes("expired")) {
        return { error: "OTP has expired. Please request a new one." };
    }
    if (error.message.includes("Invalid")) {
        return { error: "Invalid OTP. Please try again." };
    }
    return { error: "Could not verify OTP. Please try again." };
  }

  if (data.session) {
    // OTP is correct and not expired. The user now has a valid session.
    return { success: true };
  }

  // Fallback for an unexpected case where there's no error but no session.
  return { error: "Could not verify your identity. Please try again." };
}


export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const supabase = createClient();

    // The user object can be updated because a session exists after OTP verification.
    const { error } = await supabase.auth.updateUser({ 
        password: password,
    });

    if (error) {
        return { error: "Could not update password. Please try again." };
    }

    // After updating, sign the user out to force a new login
    await supabase.auth.signOut();
    return redirect("/login?message=Your password has been reset successfully. Please sign in.");
}
