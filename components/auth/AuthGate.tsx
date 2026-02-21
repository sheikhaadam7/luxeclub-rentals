'use client'

import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

type AuthView = 'login' | 'signup'

interface AuthGateProps {
  redirectTo?: string
}

export function AuthGate({ redirectTo }: AuthGateProps) {
  const [view, setView] = useState<AuthView>('login')

  if (view === 'signup') {
    return <SignupForm onSwitch={() => setView('login')} redirectTo={redirectTo} />
  }

  return <LoginForm onSwitch={() => setView('signup')} redirectTo={redirectTo} />
}
