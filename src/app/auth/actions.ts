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
    const origin = headers().get('origin');
    const email = formData.get("email") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?type=recovery`,
    });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}
