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

  // First, check if a user with this email already exists in auth.users
  // by attempting a sign-in, which is a safe way to check without admin rights.
  // A more direct public-facing check isn't available for security reasons.
  // Note: This check is imperfect but the best we can do without elevated privileges.
  // Supabase's signUp will perform the definitive check.
  
  const { data: existingUser, error: existingUserError } = await supabase
    .from('users_public')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return { error: "An account with this email already exists. Please try logging in." };
  }


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
    
    const { data, error: selectError } = await supabase
      .from('users_public')
      .select('email')
      .eq('email', email)
      .single();

    if (selectError || !data) {
       // To avoid email enumeration, we redirect to the same success page
       // but we don't actually send an email.
       return redirect(`/verify-otp?email=${email}&message=If an account with this email exists, a code has been sent.`);
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${headers().get('origin')}/auth/callback?next=/reset-password`
    });

    if (error) {
        // Log the error for debugging but don't expose it to the user.
        console.error("Forgot Password Error:", error.message);
    }
    
    // The page itself will inform the user to check their inbox.
    return redirect(`/verify-otp?email=${email}&message=If an account with this email exists, a code has been sent.`);
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

    await supabase.auth.signOut();
    return redirect("/login?message=Password reset successfully. Please sign in.");
}
