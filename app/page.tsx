'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  Users,
  FileText,
  BarChart3,
  Calendar,
  Lock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'

export default function HomePage() {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)

  function copyCreds(email: string, pass: string, key: string) {
    navigator.clipboard.writeText(`${email}\n${pass}`)
    setCopiedAccount(key)
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const demoAccounts = [
    {
      key: 'admin',
      role: 'Admin / Head of Dept',
      name: 'Hong Vin / Washiba',
      email: 'admin@rupp.edu.kh',
      pass: 'admin@123',
      badge: 'Full Access',
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
    },
    {
      key: 'teacher',
      role: 'Faculty Teacher',
      name: 'Toem Theara (Class M1)',
      email: 'teacher@rupp.edu.kh',
      pass: 'teacher@123',
      badge: 'Class Manager',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    },
    {
      key: 'monitor',
      role: 'Class Monitor (Student)',
      name: 'Thypheap Sachak Ponleu Pragna',
      email: 'sachakponleupragna.thypheap.3624@rupp.edu.kh',
      pass: 'student@123',
      badge: 'Student + Leave Approver',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
      key: 'student',
      role: 'Standard Student',
      name: 'Ty Kimhong (M1202501)',
      email: 'kimhong.ty.3624@rupp.edu.kh',
      pass: 'student@123',
      badge: 'QR Check-in & History',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-800/10 dark:bg-red-900/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-amber-600/10 dark:bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Headline and Call-to-actions */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* University Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-900 dark:text-red-300 border border-red-200 dark:border-red-900/60 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span>Royal University of Phnom Penh • Faculty of Engineering</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.12]">
                  Smart Campus{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-700 via-red-800 to-amber-700 dark:from-red-400 dark:via-red-300 dark:to-amber-400">
                    Attendance
                  </span>{' '}
                  & Management Portal
                </h1>

                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  Streamlining higher education attendance tracking with sub-second QR code verification,
                  digital student ID cards, automated leave approval workflows, and authoritative Row-Level Security.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 text-base font-bold text-white bg-red-800 hover:bg-red-900 active:bg-red-950 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                  >
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs transition-all"
                  >
                    <span>Register Account</span>
                  </Link>

                  <Link
                    href="/services"
                    className="inline-flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold text-red-800 dark:text-red-400 hover:underline"
                  >
                    <span>Explore Features</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Key feature pills */}
                <div className="pt-4 border-t border-gray-200/80 dark:border-gray-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Instant QR Verification</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-red-700 dark:text-red-400" />
                    <span>Postgres RLS Security</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Mobile-Optimized PWA</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Digital Student ID Card Showcase */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden transform hover:scale-[1.01] transition-transform">
                  {/* Top University Header of Card */}
                  <div className="bg-gradient-to-r from-red-900 to-red-800 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 p-1 flex items-center justify-center border border-white/20">
                        <Image
                          src="/logo.svg"
                          alt="Logo"
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold tracking-widest uppercase opacity-80">
                          Royal University of Phnom Penh
                        </div>
                        <div className="text-sm font-extrabold tracking-tight">
                          Digital Student ID & Attendance
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Active
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-5">
                    {/* Student Info Row */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-extrabold text-2xl flex items-center justify-center border border-red-200 dark:border-red-900">
                        TS
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 dark:text-white truncate">
                            Thypheap Sachak Ponleu Pragna
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          ID: M1202502 • Roll: 02
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Class Monitor
                          </span>
                          <span className="text-xs text-gray-400">• Class M1 (DSE)</span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Gauge */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Semester Attendance Rate
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          94.5% (In Good Standing)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-600 h-full w-[94.5%]" />
                        <div className="bg-red-600 h-full w-[5.5%]" />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-medium">
                        <span>Threshold: 80% Min</span>
                        <span>38 Present • 2 Late • 1 Excused</span>
                      </div>
                    </div>

                    {/* Interactive Simulator Quick Actions */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-[11px] font-bold text-gray-900 dark:text-white">
                            Scan Today QR
                          </div>
                          <div className="text-[9px] text-gray-400">Camera or manual code</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-[11px] font-bold text-gray-900 dark:text-white">
                            Leave Request
                          </div>
                          <div className="text-[9px] text-gray-400">Doctor / emergency note</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer link to direct login */}
                    <Link
                      href="/student/home"
                      className="w-full py-2.5 px-4 text-xs font-bold text-center block text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-colors"
                    >
                      Open Live Student Portal →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Metrics Stats Banner */}
        <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 text-center">
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black text-red-800 dark:text-red-400">
                  98.4%
                </div>
                <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                  On-Time Attendance
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                  &lt; 2.0s
                </div>
                <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                  QR Scan Verification
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black text-red-800 dark:text-red-400">
                  100%
                </div>
                <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Row-Level Security (RLS)
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                  3 Roles
                </div>
                <div className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Student, Teacher, Admin
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Core Roles Section */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 mb-3">
              Role-Based Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Tailored Portals for Every Member of Campus
            </h2>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
              Each portal is customized with appropriate controls and access levels, enforced cryptographically through Supabase JWTs and database policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between hover:shadow-xl transition-all">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Student & Monitor Portal
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mobile-style dashboard built for rapid check-ins, subject-by-subject status tracking, and instant leave requests.
                </p>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Instant camera & manual QR code entry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>80% threshold warning indicators</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Class Monitor short-leave approvals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Personal CSV attendance export</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href="/student/home"
                  className="w-full py-2.5 px-4 text-sm font-bold text-center block text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-colors"
                >
                  Access Student App →
                </Link>
              </div>
            </div>

            {/* Teacher Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between hover:shadow-xl transition-all">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Teacher & Faculty Suite
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Classroom attendance cockpit with real-time feed, daily QR generation, manual status adjustments, and leave approval queues.
                </p>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Generate today’s check-in QR in 1 click</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Assigned classes isolation (RLS protected)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Appoint official Class Monitor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Batch approve student leave requests</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href="/admin/classes"
                  className="w-full py-2.5 px-4 text-sm font-bold text-center block text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
                >
                  Access Teacher Suite →
                </Link>
              </div>
            </div>

            {/* Admin Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between hover:shadow-xl transition-all">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Head of Dept & Admin
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Full governance over academic rosters, teacher class allocations, semester transitions, audit logs, and user registration approvals.
                </p>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Audit log tracking all system events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approve new @rupp.edu.kh accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Assign classes to faculty members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Semester rollover & archives</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href="/admin/home"
                  className="w-full py-2.5 px-4 text-sm font-bold text-center block text-white bg-red-800 hover:bg-red-900 rounded-xl transition-colors"
                >
                  Access Admin Center →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Accounts Evaluation Box */}
        <section className="bg-red-50/50 dark:bg-red-950/20 border-y border-red-100 dark:border-red-900/40 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 mb-2">
                  Instant Access For Evaluators
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                  Demo & Testing Accounts
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Ready-to-use accounts pre-configured in the database. Click any card to copy login credentials.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-red-800 dark:text-red-400 hover:underline"
              >
                <span>Go to Sign In Page</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.key}
                  onClick={() => copyCreds(acc.email, acc.pass, acc.key)}
                  className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 text-left hover:border-red-400 dark:hover:border-red-700 transition-all shadow-xs relative group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${acc.badgeColor}`}>
                      {acc.badge}
                    </span>
                    <span className="text-gray-400 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                      {copiedAccount === acc.key ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-gray-900 dark:text-white">
                    {acc.role}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {acc.name}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
                    <div className="text-[11px] font-mono text-gray-600 dark:text-gray-300 truncate">
                      {acc.email}
                    </div>
                    <div className="text-[11px] font-mono text-gray-400">
                      Pass: <span className="font-semibold text-gray-700 dark:text-gray-300">{acc.pass}</span>
                    </div>
                  </div>

                  {copiedAccount === acc.key && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      Copied!
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Highlights */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                Core Innovations
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
                Built to Eliminate Roll-Call Friction & Protect Academic Standing
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Traditional paper sheets lead to attendance fraud, lost records, and delayed alerts when students drop below the mandatory 80% mark.
                RUPP Attendance replaces this with instant digital accountability.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      Time-Sensitive QR Tokens
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Faculty generate session-specific QR codes that validate only during class hours. Prevents off-campus proxy scanning.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      80% Attendance Threshold Safety
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Visual indicators turn from green to orange and red automatically when student rates approach exam ineligibility.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      Delegated Class Monitor Approvals
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Short 1-day absence requests can be verified by the designated Class Monitor, freeing faculty to focus on teaching.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Showcase Card */}
            <div className="bg-gradient-to-br from-gray-900 to-red-950 text-white rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono uppercase tracking-widest text-red-300">
                    System Audit Trail
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
                    <span className="text-gray-400">14:45:01</span>
                    <span className="text-emerald-400">QR Check-in Verified: M1202501</span>
                    <span className="text-gray-500">Method: QR</span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
                    <span className="text-gray-400">14:42:18</span>
                    <span className="text-blue-400">QR Session Created: Class M1</span>
                    <span className="text-gray-500">Teacher: T. Theara</span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
                    <span className="text-gray-400">14:38:50</span>
                    <span className="text-amber-400">Leave Approved: M1202504 (1 Day)</span>
                    <span className="text-gray-500">By: Class Monitor</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Audited per SRS §3.2.3</span>
                  <Link
                    href="/about"
                    className="text-xs font-bold text-red-300 hover:text-white flex items-center gap-1"
                  >
                    <span>Read System Architecture</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ready to start banner */}
        <section className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Access Royal University Attendance?
            </h3>
            <p className="text-red-100 max-w-xl mx-auto text-sm sm:text-base">
              Sign in with your official university credentials to view your class roster, check in, or review attendance analytics.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-bold bg-white text-red-900 hover:bg-gray-100 rounded-xl shadow-md transition-all"
              >
                Sign In to Your Account
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3 text-sm font-bold bg-red-950/60 text-white hover:bg-red-950 border border-white/20 rounded-xl transition-all"
              >
                Contact Department Support
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
