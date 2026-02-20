'use client'

import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'
import { OTPForm } from './OTPForm'

type AuthView = 'login' | 'signup' | 'otp'

interface PendingMFA {
  factorId: string
  challengeId: string
}

export function AuthGate() {
  const [view, setView] = useState<AuthView>('login')
  const [pendingMFA, setPendingMFA] = useState<PendingMFA | null>(null)

  if (view === 'otp' && pendingMFA) {
    return (
      <OTPForm
        factorId={pendingMFA.factorId}
        challengeId={pendingMFA.challengeId}
      />
    )
  }

  if (view === 'signup') {
    return (
      <SignupForm
        onSwitch={() => setView('login')}
        onPhoneStep={(mfa) => {
          setPendingMFA(mfa)
          setView('otp')
        }}
      />
    )
  }

  return <LoginForm onSwitch={() => setView('signup')} />
}
