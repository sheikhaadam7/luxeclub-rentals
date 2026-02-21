'use client'

import { useState } from 'react'
import { updateProfile } from '@/app/actions/profile'

interface Props {
  initialPhone: string
  initialAddress: string
}

export default function AccountProfileForm({ initialPhone, initialAddress }: Props) {
  const [phone, setPhone] = useState(initialPhone)
  const [address, setAddress] = useState(initialAddress)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const result = await updateProfile({ phone, home_address: address })

    if ('error' in result && result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-5">
      <h2 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Personal Details</h2>

      <div className="space-y-4">
        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-sm text-white/50">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+971 5X XXX XXXX"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-all duration-300"
          />
        </div>

        {/* Home Address */}
        <div className="space-y-1.5">
          <label className="text-sm text-white/50">Home Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Building, Street, Area, Dubai"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-all duration-300"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
      >
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
      </button>
    </section>
  )
}
