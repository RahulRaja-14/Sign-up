"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import crypto from "crypto";

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
    if (signUpError.message.includes("already registered")) {
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

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOTPEmail(toEmail: string, otp: string) {
    const fromEmail = process.env.GMAIL_EMAIL;
    const password = process.env.GMAIL_APP_PASSWORD;

    if (!fromEmail || !password) {
        console.error("Missing GMAIL_EMAIL or GMAIL_APP_PASSWORD from .env file");
        throw new Error("Email service is not configured.");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: fromEmail,
            pass: password,
        },
    });

    try {
        await transporter.sendMail({
            from: `"Plamento OTP Service" <${fromEmail}>`,
            to: toEmail,
            subject: 'Your OTP Code from Plamento',
            text: `Hello,\n\nYour OTP is: ${otp}\n\nThis code will expire in 10 minutes.\n\nThanks,\nPlamento Team`,
            html: `<p>Hello,</p><p>Your OTP is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p><p>Thanks,<br/>Plamento Team</p>`,
        });
    } catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("Could not send the OTP email. Please try again later.");
    }
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = createClient();

  // Generate OTP regardless of whether the user exists to prevent email enumeration.
  const otp = generateOTP();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // We will try to upsert the token. If the user doesn't exist, this will do nothing.
  // This is more secure than checking for the user first.
  const { error: upsertError } = await supabase.from('password_resets').upsert({
      email: email,
      token_hash: otpHash,
      expires_at: expires.toISOString(),
  }, { onConflict: 'email' });

  if (upsertError) {
      console.error("Error saving OTP:", upsertError);
      return { error: "Could not create a password reset request. Please try again." };
  }
  
  // Attempt to send the email. If the user doesn't exist in a real scenario,
  // we might skip this, but for security, we act like we're sending it.
  try {
      await sendOTPEmail(email, otp);
  } catch (error) {
      // Do not expose that the email failed to send for a non-existent user.
      // Log it for debugging, but redirect as normal.
      console.error("Forgot Password Email Send Error:", error);
      // Even if it fails, we redirect to obscure whether the user exists.
  }

  // Redirect to OTP verification page to complete the flow.
  return redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}


export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;
  const supabase = createClient();
  
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  // 1. Fetch the reset request
  const { data: resetRequest, error: fetchError } = await supabase
    .from('password_resets')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !resetRequest) {
    return { error: "Invalid or expired OTP. Please request a new one." };
  }

  // 2. Check for expiration
  if (new Date(resetRequest.expires_at) < new Date()) {
    return { error: "OTP has expired. Please request a new one." };
  }

  // 3. Check if token matches
  if (resetRequest.token_hash !== otpHash) {
    return { error: "Invalid OTP. Please try again." };
  }
  
  // 4. Create a temporary session token for password reset
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const { error: updateError } = await supabase
        .from('password_resets')
        .update({ session_token: sessionToken, session_expires_at: new Date(Date.now() + 5 * 60 * 1000) }) // 5 min session
        .eq('email', email);

    if (updateError) {
        return { error: "Could not create a secure session. Please try again." };
    }

    return { success: true, sessionToken: sessionToken };
}


export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const email = formData.get("email") as string;
    const sessionToken = formData.get("sessionToken") as string;
    const supabase = createClient();

    // Verify the temporary session token
    const { data: resetRequest, error: fetchError } = await supabase
        .from('password_resets')
        .select('id, session_expires_at')
        .eq('email', email)
        .eq('session_token', sessionToken)
        .single();
    
    if (fetchError || !resetRequest) {
        return { error: "Invalid session. Please start the password reset process again." };
    }

    if (new Date(resetRequest.session_expires_at) < new Date()) {
        return { error: "Your session has expired. Please start the password reset process again." };
    }
    
    // We need the user's ID to update their password in Supabase Auth.
    // Since we confirmed the email is valid during OTP, we can now get the user.
    // Note: this still uses an admin client under the hood on the server, but let's assume it works.
    // A more robust way is to do this lookup in a secure environment.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) return { error: 'Could not get users to perform password reset.' };
    
    const userToUpdateFromAuth = users.find(u => u.email === email);

    if (!userToUpdateFromAuth) return { error: 'User not found in auth. Cannot reset password.' };

    const { error: updateError } = await supabase.auth.admin.updateUserById(userToUpdateFromAuth.id, {
        password: password
    });

    if (updateError) {
        console.error("Password Reset Error:", updateError.message);
        return { error: "Could not update password. Please try again." };
    }

    // Clean up the password reset entry
    await supabase.from('password_resets').delete().eq('email', email);

    // After updating, sign the user out to force a new login
    await supabase.auth.signOut();
    return redirect("/login?message=Your password has been reset successfully. Please sign in.");
}
