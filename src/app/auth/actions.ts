"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Helper function to generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendWelcomeEmail(email: string, firstName: string) {
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
        from: `"Plamento" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: "Welcome to Plamento!",
        text: `Hi ${firstName},

Welcome to Plamento! We're thrilled to have you on board.

Enjoy the platform!

Thanks,
The Plamento Team`,
        html: `<p>Hi ${firstName},</p><p>Welcome to Plamento! We're thrilled to have you on board.</p><p>Enjoy the platform!</p><p>Thanks,<br/>The Plamento Team</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${email}`);
    } catch (error) {
        console.error("Error sending welcome email:", error);
    }
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
    text: `Hello,

Your one-time password is: ${otp}

This code will expire in 10 minutes.

Thanks,
Plamento Team`,
    html: `<p>Hello,</p><p>Your one-time password is: <b>${otp}</b></p><p>This code will expire in 10 minutes.</p><p>Thanks,<br/>Plamento Team</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
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

  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, 
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      dob: dob,
    },
  });

  if (signUpError) {
    console.error("Admin user creation error:", signUpError.message);
    return { error: "A user with this email may already exist. Please try again." };
  }

  if (signUpData.user) {
    await sendWelcomeEmail(email, firstName);

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError) {
        console.error("Sign in after signup failed:", signInError);
        return { error: "Account created, but auto-login failed. Please try to log in." };
    }

    return redirect("/dashboard");
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

  const { data: user, error: userError } = await supabase
    .from("user_details")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !user) {
    return { error: "This email is not registered. Please sign up." };
  }

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); 
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const { error: upsertError } = await supabase.from("password_resets").upsert({
    email: email,
    token: hashedOtp,
    expires_at: expires.toISOString(),
  });

  if (upsertError) {
    console.error("Error creating password reset request:", upsertError);
    return { error: "Could not create a password reset request. Please try again." };
  }

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
    await supabase.from("password_resets").delete().eq("email", email);
    return { error: "OTP has expired. Please request a new one." };
  }
  
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  const { error: updateError } = await supabase
    .from("password_resets")
    .update({
      token: hashedResetToken,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .eq("email", email);

  if (updateError) {
    return { error: "Could not initiate password reset. Please try again." };
  }

  return { success: true, redirectUrl: `/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}` };
}

export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const token = formData.get("token") as string;
    const email = formData.get("email") as string;
    const supabase = createClient();

    if (!password || !token || !email) {
        return { error: "Invalid password reset request. Please try again." };
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const { data: tokenData, error: tokenError } = await supabase
        .from("password_resets")
        .select("*")
        .eq("email", email)
        .eq("token", hashedToken)
        .single();

    if (tokenError || !tokenData) {
        return { error: "Invalid or expired password reset link. Please try again." };
    }

    if (new Date(tokenData.expires_at) < new Date()) {
        await supabase.from("password_resets").delete().eq("email", email);
        return { error: "Your password reset link has expired. Please request a new one." };
    }

    const { data: userData, error: userError } = await supabase
        .from("user_details")
        .select("id")
        .eq("email", email)
        .single();

    if (userError || !userData) {
        return { error: "Could not find a user with that email." };
    }
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
        userData.id,
        { password: password }
    );

    if (updateError) {
        return { error: "Could not update password. Please try again." };
    }
    
    await supabase.from("password_resets").delete().eq("email", email);
    
    await supabase.auth.signOut();

    return { 
        success: true, 
        redirectUrl: "/login?message=Your password has been reset successfully. Please sign in." 
    };
}
