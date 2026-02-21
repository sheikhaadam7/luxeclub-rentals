'use client'

import { useState } from 'react'

const WHATSAPP_NUMBER = '971588086137'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Build WhatsApp message with form data
    const message = `Name: ${name}\nEmail: ${email}\nQuestion: ${question}`
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      '_blank'
    )
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05]">
            <span className="text-white/50">Any questions?</span>
            <br />
            <span className="text-white">I&apos;m all ears.</span>
          </h1>
        </div>

        {/* Contact details + Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact details */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 space-y-4">
            <p className="text-sm text-white/50 font-medium">Contact details</p>
            <div className="space-y-2">
              <a
                href="mailto:hello@luxeclubrentals.ae"
                className="block text-lg text-white hover:text-brand-cyan transition-colors duration-300"
              >
                hello@luxeclubrentals.ae
              </a>
              <a
                href={`tel:+${WHATSAPP_NUMBER}`}
                className="block text-lg text-white hover:text-brand-cyan transition-colors duration-300"
              >
                +971 588086137
              </a>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 space-y-4">
            <p className="text-sm text-white/50 font-medium">Address</p>
            <p className="text-lg text-white leading-relaxed">
              Binary Tower, 32 Marasi Drive Street – Business Bay – Dubai – United Arab Emirates
            </p>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 sm:p-10">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-950/40 border border-green-700/40 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-white">Message sent</p>
              <p className="text-sm text-white/40">We&apos;ll get back to you as soon as possible.</p>
              <button
                type="button"
                onClick={() => { setSubmitted(false); setName(''); setEmail(''); setQuestion('') }}
                className="mt-4 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="firstname lastname"
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-cyan focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(0,153,255,0.2),0_0_20px_rgba(0,153,255,0.06)] transition-all duration-300"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@email.com"
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-cyan focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(0,153,255,0.2),0_0_20px_rgba(0,153,255,0.06)] transition-all duration-300"
                />
              </div>

              {/* Question */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What's on your mind?"
                  required
                  rows={5}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-all duration-300 resize-y"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-brand-cyan text-white text-base font-medium hover:bg-brand-cyan-hover shadow-[0_0_20px_rgba(0,153,255,0.15)] hover:shadow-[0_0_30px_rgba(0,153,255,0.25)] transition-all duration-300"
              >
                Submit form
              </button>
            </form>
          )}
        </div>

        {/* Google Maps embed */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3610.5!2d55.2675!3d25.1865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69d1a9f1e2b3%3A0x1234567890abcdef!2sThe%20Binary%20by%20Omniyat!5e0!3m2!1sen!2sae!4v1700000000000!5m2!1sen!2sae"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="LuxeClub Rentals Location"
          />
        </div>

      </div>
    </main>
  )
}
