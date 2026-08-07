"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Wifi } from "lucide-react";
import ThemeToggle from "@/app/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logger";

// Where each role lands after signing in (class monitors are students, so
// they land on the student app and reach the approval queue from there)
function homeForRole(role: string) {
  if (role === "teacher" || role === "admin") return "/admin/classes";
  return "/student/home";
}

// Role and status both come from profiles. The JWT's user_metadata role is
// whatever the person picked when registering, so it is never trusted here.
async function fetchAccess(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .single();
  return { role: profile?.role ?? "user", status: profile?.status ?? "pending" };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { role, status } = await fetchAccess(data.user.id);

    // Signed in successfully but still waiting on (or refused) approval
    if (status !== "approved") {
      logActivity(`[Auth] ${email} signed in but is ${status} approval`);
      router.push("/pending");
      return;
    }

    logActivity(`[Auth] ${email} signed in (${role})`);
    router.push(homeForRole(role));
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3] flex items-center justify-center relative px-4 py-10 overflow-hidden">
      {/* Campus photo, faded to 30% behind the login card */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 pointer-events-none"
        style={{ backgroundImage: "url('/rupp-campus.jpg')" }}
      />

      <ThemeToggle className="fixed top-4 right-4 z-10" />

      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="mb-4">
          <Image src="/logo.svg" alt="Logo" width={110} height={110} className="object-contain" />
        </div>

        <p className="text-gray-600 text-sm font-medium mb-1 text-center tracking-wide">
          Royal University of Phnom Penh
        </p>

        <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-widest text-gray-800 mb-2 text-center">
          RUPP Attendance
        </h1>

        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 mb-8">
          <Wifi size={14} />
          Connect To RUPP WiFi
        </p>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 w-full max-w-[400px] px-8 py-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                RUPP Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@rupp.edu.kh"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center -mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl w-full shadow-sm transition-colors duration-200 text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Login"}
            </button>

            <p className="text-center text-sm text-gray-500">
              New here?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
