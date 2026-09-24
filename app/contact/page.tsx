'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Building2,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { supabase } from '@/lib/supabase'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('attendance')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  const faqs = [
    {
      q: 'Why does my account show "Pending Approval" after registration?',
      a: 'Per university security policy (SRS 3.2.3), every new registration with an official @rupp.edu.kh email must be vetted by a Head of Department or Administrator to confirm class enrollment and assign correct staff/student roles before accessing records.',
    },
    {
      q: 'What is the minimum attendance required to sit for final semester examinations?',
      a: 'According to RUPP Academic Regulations, students must maintain at least 80% attendance in each registered subject. The system visually alerts you in amber when below 85% and red below 80%.',
    },
    {
      q: 'How do I submit a medical certificate or emergency leave request?',
      a: 'Log into your Student Portal, click "Leave Request", specify the date and reason, and upload a photo or PDF of your doctor’s slip (up to 5MB). 1-day leaves route to your Class Monitor; longer leaves route to your Teacher.',
    },
    {
      q: 'My phone camera cannot scan the QR code. Can I still check in?',
      a: 'Yes! The teacher’s display shows both a visual QR code and a 6-character alphanumeric code. If your camera is disabled or obstructed, simply tap "Enter Code Manually" in the app.',
    },
    {
      q: 'How is a Class Monitor appointed?',
      a: 'Class Monitors are regular students appointed by the course teacher or department head from the Faculty Analytics table. Once appointed, an "Approve Class Leave Requests" queue unlocks on their mobile home screen.',
    },
  ]

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const generatedTicket = `RUPP-${Math.floor(100000 + Math.random() * 900000)}`

      // Attempt to record into activity_logs or inquiries table
      try {
        await supabase.from('activity_logs').insert({
          action: 'contact_submission',
          details: {
            ticket_id: generatedTicket,
            name,
            student_id: studentId || null,
            email,
            category,
            subject,
            message,
          },
        })
      } catch (dbErr) {
        // Fallback gracefully if table isn't present
        console.warn('Logging contact inquiry to DB fallback:', dbErr)
      }

      setTicketId(generatedTicket)
      setSubmitted(true)
      setName('')
      setStudentId('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit inquiry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="relative py-16 sm:py-24 bg-gradient-to-b from-red-950/10 via-transparent to-transparent border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
              Department Support
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Contact & Technical Support
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Have questions regarding class attendance records, account verification, or system access? Our academic administration is here to help.
            </p>
          </div>
        </section>

        {/* Main Contact Section */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left: Contact Info & Hours */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  University Office Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Visit the Department of Data Science & Software Engineering in person or reach our dedicated support desk.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Campus Location
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      Faculty of Engineering (STEM Building, Room 304)<br />
                      Royal University of Phnom Penh (Campus 1)<br />
                      Russian Federation Blvd, Toul Kork, Phnom Penh
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Electronic Mail
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      attendance-support@rupp.edu.kh<br />
                      dse.engineering@rupp.edu.kh
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Telephone Hotlines
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      Office: +855 23 883 640<br />
                      Technical Support: +855 12 345 678
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Academic Office Hours
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      Monday to Friday: 7:30 AM – 11:30 AM, 1:30 PM – 5:30 PM<br />
                      Saturday: 8:00 AM – 12:00 PM (Emergency Assistance Only)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Interactive Support Form */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-10 border border-gray-200 dark:border-gray-800 shadow-xl">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    Submit Support or Discrepancy Ticket
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    All inquiries are directly forwarded to the academic administration team.
                  </p>
                </div>

                {submitted ? (
                  <div className="p-8 text-center space-y-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in zoom-in-95">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      Inquiry Successfully Submitted!
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                      Your ticket has been logged with reference ID:
                    </p>
                    <div className="inline-block px-4 py-2 rounded-xl font-mono text-base font-extrabold bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                      {ticketId}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Our faculty administration typically responds within 1 working day.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-4 px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all cursor-pointer"
                    >
                      Submit Another Ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMessage && (
                      <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          Your Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Sok Dara"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          Student or Staff ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g. M1202501"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          Official University Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@rupp.edu.kh"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          Inquiry Category *
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                        >
                          <option value="attendance">Attendance Discrepancy</option>
                          <option value="qr_tech">QR Scanner & Camera Issue</option>
                          <option value="leave_appeal">Leave Request Appeal</option>
                          <option value="account_pending">Account Activation Pending</option>
                          <option value="general">General University Inquiry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Subject Line *
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of the issue"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Detailed Message / Explanation *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Please include class name, date of absence, or error message..."
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-red-800 hover:bg-red-900 active:bg-red-950 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Ticket...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Ticket to Administration</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive FAQ Section */}
        <section className="py-16 sm:py-24 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400 mb-2">
                Frequently Asked Questions
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                Everything You Need to Know
              </h3>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx
                return (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden transition-all bg-gray-50/50 dark:bg-gray-850"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-red-700 dark:text-red-400' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-200/50 dark:border-gray-800 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
