"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/logger";

const roles = [
  { value: "user", title: "Student", description: "Check in to classes and submit leave requests" },
  { value: "teacher", title: "Teacher", description: "Manage attendance and approve leave requests for your classes" },
  { value: "admin", title: "Admin / Head of Dept", description: "Full access, including the system activity log" },
];

function roleLabel(value: string) {
  return roles.find(r => r.value === value)?.title ?? value;
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.toLowerCase().endsWith("@rupp.edu.kh")) {
      setError("Registration requires an official RUPP email (@rupp.edu.kh)");
      return;
    }

    // Password policy (SRS 3.2.3): length plus letter and number
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError("Password must be at least 8 characters and include a letter and a number");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // The signup trigger creates the profile as 'pending' with the chosen role
    // recorded only as a request — deliberately not written here, so the form
    // can't grant itself access. Everyone waits for an admin either way.
    logActivity(`[Auth] New account registered (awaiting approval): ${email} requested ${roleLabel(role)}`);

    if (data.session) {
      // Email confirmation is off, so they're signed in but still unapproved
      router.push("/pending");
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3] flex items-center justify-center relative px-4 py-10">
      <ThemeToggle className="fixed top-4 right-4 z-10" />
      <div className="flex flex-col items-center w-full">
        <div className="mb-4">
          <Image src="/logo.svg" alt="Logo" width={110} height={110} className="object-contain" />
        </div>

        <p className="text-gray-600 text-sm font-medium mb-1 text-center tracking-wide">
          Royal University of Phnom Penh
        </p>

        <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-widest text-gray-800 mb-8 text-center">
          Create Account
        </h1>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 w-full max-w-[400px] px-8 py-8">
          {success ? (
            <div className="text-center py-4">
              <p className="text-base font-semibold text-gray-800 mb-2">Request received</p>
              <p className="text-sm text-gray-500 mb-4">
                We sent a confirmation link to <span className="font-medium">{email}</span>.
                Confirm your email, then sign in.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Your account also needs to be approved by an admin or the Head of Department
                before you can use it. You asked to join as{" "}
                <span className="font-medium">{roleLabel(role)}</span> — they&apos;ll confirm that
                when they approve you.
              </p>
              <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fullName" className="text-sm font-semibold text-gray-700">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <p className="text-xs text-gray-400">At least 8 characters, with a letter and a number.</p>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-gray-700 mb-0.5">Role</legend>
                <p className="text-xs text-gray-400 mb-1.5">
                  This is a request — an admin or the Head of Department confirms it before your
                  account becomes active.
                </p>
                {roles.map((r) => (
                  <label
                    key={r.value}
                    className={[
                      "flex items-start gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                      role === r.value ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-gray-300",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="mt-0.5 accent-blue-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-800">{r.title}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{r.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {error && (
                <p className="text-sm text-red-500 text-center -mt-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl w-full shadow-sm transition-colors duration-200 text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Creating…" : "Register"}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
