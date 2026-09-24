import Link from 'next/link'
import Image from 'next/image'
import {
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  ExternalLink,
  Heart,
  Calendar,
} from 'lucide-react'

export default function Footer() {
  return (
    <footer className="w-full bg-gray-950 text-gray-400 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Column 1: Brand & University Identity */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800/60 p-1 flex items-center justify-center">
                <Image
                  src="/logo.svg"
                  alt="RUPP Crest"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-lg tracking-tight">
                  Royal University of Phnom Penh
                </h3>
                <p className="text-xs text-red-400 font-semibold tracking-wide uppercase">
                  Faculty of Engineering • Department of DSE
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              The official smart campus attendance management platform for staff, faculty, and students.
              Engineered with modern web technologies, strict data security, and real-time attendance tracking.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Academic Year 2025–2026 • Semester 2 Live</span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Portal Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About the System
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition-colors">
                  Services & Modules
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Portal Access */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              User Portals
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/student/home" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>Student Dashboard</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/classes" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>Faculty & Staff Suite</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Account Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Register (@rupp.edu.kh)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Location */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Campus Office
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Russian Federation Blvd, Toul Kork, Phnom Penh, Cambodia</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-400 flex-shrink-0" />
                <a href="mailto:attendance-support@rupp.edu.kh" className="hover:text-white transition-colors">
                  support@rupp.edu.kh
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>+855 23 883 640</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} Royal University of Phnom Penh (RUPP). All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Powered by Next.js & Supabase
            </span>
            <span>•</span>
            <span className="text-gray-400">SRS 3.2 Certified Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
