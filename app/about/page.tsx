import Link from 'next/link'
import Image from 'next/image'
import {
  GraduationCap,
  ShieldCheck,
  Building,
  Users,
  Code2,
  Server,
  Database,
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'

export const metadata = {
  title: 'About the System • RUPP Attendance',
  description:
    'Learn about the Royal University of Phnom Penh Smart Attendance System, architecture, and engineering team.',
}

export default function AboutPage() {
  const teamMembers = [
    {
      name: 'Ty Kimhong',
      id: 'M1202501',
      role: 'Student & Core Contributor',
      initials: 'TK',
      dept: 'Class M1 (DSE)',
    },
    {
      name: 'Thypheap Sachak Ponleu Pragna',
      id: 'M1202502',
      role: 'Class M1 Monitor & Contributor',
      initials: 'TS',
      dept: 'Class M1 (DSE)',
    },
    {
      name: 'Tith Annchhengly',
      id: 'M1202503',
      role: 'Student & Contributor',
      initials: 'TA',
      dept: 'Class M1 (DSE)',
    },
    {
      name: 'Leang Serminh',
      id: 'M1202504',
      role: 'Student & Contributor',
      initials: 'LS',
      dept: 'Class M1 (DSE)',
    },
    {
      name: 'Pa Soborith',
      id: 'M1202505',
      role: 'Student & Contributor',
      initials: 'PS',
      dept: 'Class M1 (DSE)',
    },
  ]

  const architectureStack = [
    {
      icon: Code2,
      title: 'Next.js 16 App Router',
      category: 'Frontend & UI',
      desc: 'React 19, Tailwind CSS v4, Lucide icons, responsive mobile-first views with instantaneous page transitions.',
    },
    {
      icon: Database,
      title: 'Supabase PostgreSQL',
      category: 'Database & Storage',
      desc: 'Authoritative data layer with automated relations, indexing, document buckets for medical certificates, and avatar storage.',
    },
    {
      icon: ShieldCheck,
      title: 'Postgres Row-Level Security',
      category: 'Security & Access',
      desc: 'RLS policies enforce zero unauthorized data leakage. Teachers only query assigned classes; students only read their own records.',
    },
    {
      icon: Lock,
      title: 'Dual Route & Auth Guard',
      category: 'Authorization',
      desc: 'Role-based protection with middleware and JWT verification for Student, Class Monitor, Teacher, and Admin accounts.',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* Page Header */}
        <section className="relative py-16 sm:py-24 bg-gradient-to-b from-red-950/10 via-transparent to-transparent border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
              Institution & Mission
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              About the RUPP Attendance Platform
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Empowering academic rigor and administrative transparency at the Royal University of Phnom Penh through modern software engineering.
            </p>
          </div>
        </section>

        {/* Institution Overview Section */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="text-xs font-bold uppercase tracking-widest text-red-800 dark:text-red-400">
                Cambodia’s Flagship University
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                Rooted in Excellence at Royal University of Phnom Penh
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Founded in 1960, the Royal University of Phnom Penh (RUPP) is the nation’s oldest and largest higher education institution.
                The Faculty of Engineering and Department of Data Science & Software Engineering (DSE) are dedicated to developing cutting-edge technical talent.
              </p>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                This smart attendance platform was engineered to solve the persistent challenges of paper roll-calls, inaccurate records, and delayed leave tracking.
                With our 80% attendance requirement for final exam eligibility, real-time data visibility protects every student’s academic progress.
              </p>

              <div className="pt-2 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <div className="text-2xl font-black text-red-800 dark:text-red-400">1960</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">Founded Year</div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <div className="text-2xl font-black text-gray-900 dark:text-white">80% Min</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">Exam Eligibility Rule</div>
                </div>
              </div>
            </div>

            {/* University Crest & Campus Visual */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-lg bg-gradient-to-br from-red-900 to-gray-900 rounded-3xl p-8 sm:p-10 text-white shadow-2xl overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20">
                    <Image
                      src="/logo.svg"
                      alt="RUPP Logo"
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight">
                      Royal University of Phnom Penh
                    </h3>
                    <p className="text-xs text-red-300 font-medium">
                      Faculty of Engineering • STEM Building
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-gray-300 leading-relaxed border-t border-white/10 pt-4">
                  <p>
                    <strong>Campus Address:</strong> Russian Federation Boulevard, Toul Kork, Phnom Penh, Kingdom of Cambodia.
                  </p>
                  <p>
                    <strong>Academic Scope:</strong> Department of Data Science & Software Engineering (DSE), Department of Information Technology Engineering (ITE).
                  </p>
                  <p>
                    <strong>Compliance Standard:</strong> Software Requirements Specification (SRS §3.2) for Academic Record Management.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Architecture & Technology Stack */}
        <section className="py-16 bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400 mb-2">
                Under the Hood
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                Engineered for Speed, Reliability & Strict Security
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Designed to handle peak morning scan traffic seamlessly while enforcing zero-trust data privacy at every layer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {architectureStack.map((item, idx) => {
                const IconComponent = item.icon
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 space-y-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-400 flex items-center justify-center">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                      {item.category}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Development Group Showcase (Class M1) */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400 mb-2">
              Engineering Team
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Built by RUPP Students for RUPP Students
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              The project group behind the Class M1 implementation and campus-wide architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 text-center space-y-3 hover:border-red-400 dark:hover:border-red-700 transition-colors shadow-xs"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 font-extrabold text-lg flex items-center justify-center border border-red-200 dark:border-red-900">
                  {member.initials}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                    {member.name}
                  </h4>
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                    {member.id}
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[11px] font-semibold text-red-800 dark:text-red-400">
                    {member.role}
                  </span>
                  <div className="text-[10px] text-gray-400">{member.dept}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Department Faculty Acknowledgement */}
          <div className="mt-12 p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-800 text-white flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900 dark:text-white">
                  Academic Mentors & Faculty Advisors
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Supervised by the Faculty of Engineering and Department of Data Science & Software Engineering.
                </p>
              </div>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-red-800 hover:bg-red-900 rounded-xl transition-all flex-shrink-0"
            >
              <span>Contact Department</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
