import Link from 'next/link'
import {
  QrCode,
  ShieldCheck,
  FileText,
  Users,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Smartphone,
  Eye,
  Sliders,
  Layers,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'

export const metadata = {
  title: 'Services & Modules • RUPP Attendance',
  description:
    'Comprehensive overview of smart attendance services, QR verification, leave workflows, and analytics at RUPP.',
}

export default function ServicesPage() {
  const services = [
    {
      icon: QrCode,
      tag: 'Core Feature',
      title: 'Dynamic QR Code Verification',
      desc: 'Faculty generate session-specific QR codes at the start of class. Students scan via their mobile browser or enter the alphanumeric code. Sub-second verification recorded directly in the Supabase database.',
      benefits: ['Stops proxy check-ins', 'Camera or manual code fallback', 'Instant sync with teacher roster'],
      color: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300',
    },
    {
      icon: Smartphone,
      tag: 'Student Experience',
      title: 'Digital Student ID Card & Metrics',
      desc: 'Every student receives an interactive digital credential displaying their Roll Number, Department, and real-time attendance percentage. Visual indicators turn amber or red if falling near the 80% threshold.',
      benefits: ['Real-time attendance percentage', 'Per-subject attendance breakdown', 'Visual threshold risk flags'],
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300',
    },
    {
      icon: FileText,
      tag: 'Workflow Automation',
      title: 'Smart Digital Leave Requests',
      desc: 'Students submit absence requests with doctor notes or supporting certificates (PDF/PNG/JPG up to 5MB). Short 1-day leaves route to the Class Monitor; multi-day leaves route to Faculty and Head of Dept.',
      benefits: ['Drag & drop document upload', 'Automated routing rules', 'In-app decision notifications'],
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
    },
    {
      icon: Users,
      tag: 'Delegated Governance',
      title: 'Class Monitor Approval Queue',
      desc: 'Appointed students can review and approve 1-day absence requests for their own classmates directly from their mobile portal, offloading minor administrative load from professors.',
      benefits: ['Class-scoped security', 'Instant classmate notification', 'Monitor cannot self-approve'],
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    },
    {
      icon: BarChart3,
      tag: 'Faculty & Analytics',
      title: 'Teacher Roster Cockpit',
      desc: 'Teachers view a live feed of arriving students, filter rosters by class and date, manually adjust statuses (Present, Late, Absent), and visualize class performance with interactive charts.',
      benefits: ['Real-time attendance live feed', 'Manual check-in override', 'Per-student performance analytics'],
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
    },
    {
      icon: Calendar,
      tag: 'Academic Administration',
      title: 'Semester Rollover & Archiving',
      desc: 'Admins can transition between academic terms with a single action. Attendance counters reset for the new term while past semesters remain fully accessible and exportable.',
      benefits: ['Zero data loss on new term', 'Historical semester browsing', 'Curriculum subject linking'],
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
    },
    {
      icon: ShieldCheck,
      tag: 'Compliance & Audit',
      title: 'Tamper-Proof Audit Trail & Logs',
      desc: 'Every login, check-in, leave approval, and roster modification is immutably logged with timestamp, user ID, and IP metadata. Export filtered reports to CSV for official university records.',
      benefits: ['Full audit accountability', 'Filter by date and user', 'One-click CSV compliance export'],
      color: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    },
    {
      icon: Download,
      tag: 'Data Portability',
      title: 'Automated CSV & Report Exporting',
      desc: 'Students can export their personal attendance history for scholarship or internship verification. Faculty and Admins can export entire semester datasets.',
      benefits: ['Standard CSV spreadsheet output', 'Semester-scoped data', 'Instant browser generation'],
      color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300',
    },
  ]

  const workflowSteps = [
    {
      step: '01',
      title: 'Teacher Starts Session',
      desc: 'In the classroom, the teacher logs in, selects their class, and clicks "Generate QR Code". A unique code for today is displayed on the screen.',
    },
    {
      step: '02',
      title: 'Student Scans or Enters Code',
      desc: 'Students open the mobile web app on their phone and tap "Scan QR Code". The camera scans the screen, or the student types the code.',
    },
    {
      step: '03',
      title: 'Instant Database Verification',
      desc: 'Supabase Postgres validates the timestamp, class enrollment, and checks if already marked. Status is marked "Present" in < 2 seconds.',
    },
    {
      step: '04',
      title: 'Real-Time Sync & Analytics',
      desc: 'The teacher’s live attendance feed updates immediately. The student’s percentage bar and history refresh in real time.',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="relative py-16 sm:py-24 bg-gradient-to-b from-red-950/10 via-transparent to-transparent border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
              Platform Modules
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Comprehensive Smart Attendance Services
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Engineered to replace slow roll-calls and paper forms with an intuitive, tamper-proof academic suite.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((srv, idx) => {
              const IconComp = srv.icon
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between hover:shadow-xl hover:border-red-300 dark:hover:border-red-800 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${srv.color}`}>
                        {srv.tag}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {srv.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {srv.desc}
                    </p>

                    <div className="pt-2 space-y-1.5">
                      {srv.benefits.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* How It Works Workflow Section */}
        <section className="py-16 sm:py-24 bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400 mb-2">
                Operational Flow
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                How Daily Attendance Works
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
                Designed for seamless interaction with zero waiting in line.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {workflowSteps.map((wf, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 dark:bg-gray-850 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 relative space-y-3"
                >
                  <div className="text-3xl font-black text-red-800/30 dark:text-red-400/20 font-mono">
                    {wf.step}
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {wf.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {wf.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-red-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h3 className="text-2xl sm:text-4xl font-extrabold">
              Experience the Smart Attendance Platform
            </h3>
            <p className="text-red-100 max-w-lg mx-auto text-sm">
              Log in with your official university credentials or submit a request for an account.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-bold bg-white text-red-900 hover:bg-gray-100 rounded-xl shadow-md transition-all"
              >
                Sign In Now
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3 text-sm font-bold bg-red-950/60 text-white hover:bg-red-950 border border-white/20 rounded-xl transition-all"
              >
                Need Technical Assistance?
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
