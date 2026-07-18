"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role =
      profile?.role ??
      data.user.user_metadata?.role ??
      data.user.app_metadata?.role ??
      "user";

    router.push(role === "admin" ? "/admin/home" : "/user/home");
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3] flex items-center justify-center relative px-4 py-10">
      <span className="absolute top-4 left-4 text-xs text-gray-400 select-none">
      </span>

      <div className="flex flex-col items-center w-full">
        <div className="mb-4">
          <Image src="/logo.svg" alt="Logo" width={110} height={110} className="object-contain" />
        </div>

        <p className="text-gray-600 text-sm font-medium mb-1 text-center tracking-wide">
          Royal University of Phnom Penh
        </p>

        <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-widest text-gray-800 mb-8 text-center">
          RUPP Attendance
        </h1>

        <div className="bg-white rounded-2xl shadow-md w-full max-w-[400px] px-8 py-8">
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

            <div className="flex justify-center mt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-full w-44 transition-colors duration-200 text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Signing in…" : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
