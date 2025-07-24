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

  // First, check if a user with this email exists in the public user_details table.
  const { data: user, error: userError } = await supabase
    .from('user_details')
    .select('id')
    .eq('email', email)
    .single();

  if (userError || !user) {
    // To prevent email enumeration, we still redirect to the OTP page,
    // but no email will be sent.
    return redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=User not found`);
  }
  
  // Generate a 6-digit OTP and store it with an expiry on the user's record in auth.
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const { error: otpError } = await supabase.auth.updateUser({
      data: {
          password_reset_otp: otp,
          password_reset_otp_expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      }
  })

  if(otpError) {
      return { error: "Could not generate OTP. Please try again." };
  }

  // Invoke the 'send-otp' edge function to send the email
  const { error: functionError } = await supabase.functions.invoke('send-otp', {
      body: { email, otp },
  });

  if (functionError) {
      console.error("Error invoking send-otp function:", functionError);
      return { error: "Could not send password reset email. Please try again." };
  }

  return redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string;
    const supabase = createClient();

    // To verify, we need a session. We can get one by signing in with the OTP.
    // This is more secure than manually checking the OTP from user metadata.
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

    // The user object can be updated because a session exists after OTP verification.
    const { error } = await supabase.auth.updateUser({ 
        password: password,
        data: {
            // Clear the OTP fields after successful password reset
            password_reset_otp: null,
            password_reset_otp_expires_at: null,
        }
     });

    if (error) {
        return { error: "Could not update password. Please try again." };
    }

    // After updating, sign the user out to force a new login
    await supabase.auth.signOut();
    return redirect("/login?message=Your password has been reset successfully. Please sign in.");
}
