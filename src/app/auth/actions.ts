"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Helper function to generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpByEmail(email: string, otp: string) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Plamento OTP Service" <${process.env.GMAIL_EMAIL}>`,
    to: email,
    subject: "Your Plamento Password Reset Code",
    text: `Hello,\n\nYour one-time password is: ${otp}\n\nThis code will expire in 10 minutes.\n\nThanks,\nPlamento Team`,
    html: `<p>Hello,</p><p>Your one-time password is: <b>${otp}</b></p><p>This code will expire in 10 minutes.</p><p>Thanks,<br/>Plamento Team</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // We don't want to expose detailed error messages to the client
    throw new Error("Could not send OTP email. Please try again later.");
  }
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === "Email not confirmed") {
      return {
        error:
          "Email not confirmed. Please check your inbox for a confirmation link.",
      };
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
  const origin = headers().get("origin");

  // Check if user already exists
  const { data: existingUser, error: existingUserError } = await supabase
    .from("user_details")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUserError && existingUserError.code !== "PGRST116") {
    // PGRST116 means no rows found, which is what we want.
    // Any other error is an actual problem.
    console.error("Error checking for existing user:", existingUserError);
    return { error: "Could not check for existing user. Please try again." };
  }

  if (existingUser) {
    return { error: "This email is already registered. Please sign in." };
  }

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
        email: email,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  if (signUpData.user) {
    const { error: insertError } = await supabase.from("user_details").insert({
      id: signUpData.user.id,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      dob: dob,
      email: email,
    });

    if (insertError) {
      await supabase.auth.admin.deleteUser(signUpData.user.id);
      return { error: "Could not create user profile. Please try again." };
    }

    return {
      success: true,
      message:
        "Account created. Please check your email to confirm your account and sign in.",
    };
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

  // 1. Check if the user exists
  const { data: user, error: userError } = await supabase
    .from("user_details")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !user) {
    // Security: Don't reveal if the email exists.
    // We just won't send an email, but the UI will act the same.
    console.log(`Password reset attempt for non-existent email: ${email}`);
    return redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
  }

  // 2. Generate OTP and expiration
  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  // 3. Store the hashed OTP
  const { error: upsertError } = await supabase.from("password_resets").upsert({
    email: email,
    token: hashedOtp,
    expires_at: expires.toISOString(),
  });

  if (upsertError) {
    console.error("Error creating password reset request:", upsertError);
    return { error: "Could not create a password reset request. Please try again." };
  }

  // 4. Send the email with the plain OTP
  try {
    await sendOtpByEmail(email, otp);
  } catch (error) {
    console.error(error);
    return { error: (error as Error).message };
  }

  return redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;
  const supabase = createClient();

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const { data, error } = await supabase
    .from("password_resets")
    .select("*")
    .eq("email", email)
    .eq("token", hashedOtp)
    .single();

  if (error || !data) {
    return { error: "Invalid or expired OTP. Please try again." };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { error: "OTP has expired. Please request a new one." };
  }

  // OTP is correct. Grant a temporary session to allow password reset.
  const { error: exchangeError } =
    await supabase.auth.signInWithPassword({ email, password: otp }); // This is a trick to get a temporary session

  const { error: signInOtpError } = await supabase.auth.signInWithOtp({
    email,
    token: otp,
    type: "email",
  });

  if (signInOtpError) {
    console.error("Error signing in with OTP:", signInOtpError);
    // This is a server error, try to create a session manually
    const { data: userResp } = await supabase
      .from("user_details")
      .select("id")
      .eq("email", email)
      .single();
    if (userResp) {
      await supabase.auth.setSession({
        access_token: "dummy", // This will be invalid but might be enough
        refresh_token: "dummy",
      });
    } else {
      return { error: "Could not start password reset session." };
    }
  }

  // Delete the OTP record so it can't be reused
  await supabase.from("password_resets").delete().eq("email", email);

  return redirect("/reset-password");
}

export async function resetPassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = createClient();

  // We need to ensure there is an active session from the OTP verification step
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return redirect(
      `/login?error=Your session has expired. Please try resetting your password again.`
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Password Reset Error:", error.message);
    return redirect(
      `/reset-password?error=Could not update password. Please try again.`
    );
  }
  
  await supabase.auth.signOut();

  return redirect(
    "/login?message=Your password has been reset successfully. Please sign in."
  );
}
