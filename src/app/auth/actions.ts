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
  const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();
  
  if (listUsersError) {
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
        // If this fails, we should ideally delete the auth user as well to keep things clean.
        // For now, we'll just return the error.
        await supabase.auth.admin.deleteUser(signUpData.user.id);
        return { error: "Could not create user profile. Please try again." };
    }
      
    // Attempt to sign in the user automatically after sign-up
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // If auto sign-in fails, redirect to login with a success message
      return redirect(`/login?message=Account created successfully. Please sign in.`);
    }

    // If sign-in is successful, redirect to the dashboard
    return redirect("/dashboard");
  }

  return redirect(`/login?message=Account created. Please check your email to confirm your account and sign in.`);
}


export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

export async function forgotPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const supabase = createClient();

    // 1. Check if the user exists in the auth schema
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      return { error: "Could not verify email. Please try again." };
    }

    const userExists = users.some(user => user.email === email);

    if (!userExists) {
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
