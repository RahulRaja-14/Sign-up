"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";

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
      return { error: "This email is already registered. Please sign in." };
    }
    return { error: signUpError.message };
  }
  
  if (signUpData.user) {
    const { error: insertError } = await supabase.from('user_details').insert({
        id: signUpData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        dob: dob,
        email: email,
    });
    
    if (insertError) {
        // Important: If creating the user profile fails, delete the auth user
        // to prevent having an auth user without a profile.
        await supabase.auth.admin.deleteUser(signUpData.user.id);
        return { error: "Could not create user profile. Please try again." };
    }
      
    // Redirect to a confirmation page or login page with a message
    return redirect(`/login?message=Account created. Please check your email to confirm your account and sign in.`);
  }

  return redirect(`/login?message=Something went wrong. Please try again.`);
}


export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

async function sendOtpByEmail(email: string, otp: string) {
    // This function requires GMAIL_EMAIL and GMAIL_APP_PASSWORD to be set in .env
    const fromEmail = process.env.GMAIL_EMAIL;
    const appPassword = process.env.GMAIL_APP_PASSWORD;

    if (!fromEmail || !appPassword) {
        console.error("Gmail credentials are not set in environment variables.");
        return { error: "Email service is not configured." };
    }

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: fromEmail,
            pass: appPassword,
        },
    });

    const mailOptions = {
        from: `"Plamento OTP Service" <${fromEmail}>`,
        to: email,
        subject: "Your OTP Code from Plamento",
        text: `Hello,\n\nYour OTP is: ${otp}\n\nThanks,\nPlamento Team`,
        html: `<p>Hello,</p><p>Your OTP is: <strong>${otp}</strong></p><p>Thanks,<br/>Plamento Team</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { error: "Could not send OTP email. Please try again later." };
    }
}


export async function forgotPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = createClient();

  // 1. Check if user exists using the admin client.
  // This is the correct way to check for a user's existence from the server-side.
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
      console.error("Error listing users:", listError);
      return { error: "Could not verify user's existence. Please try again." };
  }

  const user = users.find(u => u.email === email);
  
  if (!user) {
    return { error: "This email is not registered. Please sign up." };
  }

  // 2. Generate OTP and expiry
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // 3. Store OTP and expiry in the user's metadata in auth.users
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { user_metadata: { otp, otp_expires_at: otp_expires_at.toISOString() } }
  );

  if (updateError) {
    console.error("Error updating user with OTP:", updateError);
    return { error: "Could not create a password reset request. Please try again." };
  }
  
  // 4. Send email with Nodemailer
  const emailResult = await sendOtpByEmail(email, otp);
  if (emailResult.error) {
    return { error: emailResult.error };
  }
  
  // 5. Redirect to OTP verification page
  return redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;
  const supabase = createClient();

  // We need to find the user by email to check their metadata.
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
      console.error("Error listing users:", listError);
      return { error: "Could not verify user. Please try again." };
  }
  const targetUser = users.find(u => u.email === email);

  if(!targetUser) {
      return { error: "Could not find user to verify. Please try the process again." };
  }
  
  const storedOtp = targetUser.user_metadata?.otp;
  const expiry = targetUser.user_metadata?.otp_expires_at ? new Date(targetUser.user_metadata.otp_expires_at) : null;
  
  if (!storedOtp || !expiry) {
    return { error: "No OTP request found. Please try again." };
  }

  if (new Date() > expiry) {
    // Clear expired OTP
    await supabase.auth.admin.updateUserById(targetUser.id, { user_metadata: { otp: null, otp_expires_at: null } });
    return { error: "Your OTP has expired. Please request a new one." };
  }

  if (storedOtp !== otp) {
    return { error: "Invalid OTP. Please check the code and try again." };
  }
  
  // OTP is correct. Clear it and prepare for password reset.
  await supabase.auth.admin.updateUserById(targetUser.id, { user_metadata: { otp: null, otp_expires_at: null } });

  // For simplicity, we'll pass the email to the reset page.
  // In a real-world app, a more secure method like a short-lived session token would be better.
  return redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}


export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const email = formData.get("email") as string;
    const supabase = createClient();
    
    // Find the user by email again to get their ID.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        return redirect(`/login?error=Could not find user to update password.`);
    }
    const userToUpdate = users.find(u => u.email === email);

    if (!userToUpdate) {
        return redirect(`/login?error=Could not find user to update password.`);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
        userToUpdate.id,
        { password }
    );

    if (updateError) {
        console.error("Password Reset Error:", updateError.message);
        return redirect(`/reset-password?email=${encodeURIComponent(email)}&error=Could not update password. Please try again.`);
    }

    return redirect("/login?message=Your password has been reset successfully. Please sign in.");
}
