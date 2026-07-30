"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/auth/session";
import { ADMIN_COOKIE } from "@/lib/auth/admin";

const WEEK_SECONDS = 7 * 24 * 3600;

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!hash || !secret) {
    return { error: "Admin auth isn't configured — set ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET." };
  }
  if (!password || !(await bcrypt.compare(password, hash))) {
    return { error: "That password didn't match." };
  }

  const token = await createSessionToken(secret, WEEK_SECONDS * 1000);
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WEEK_SECONDS,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
