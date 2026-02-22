'use client'

import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'

type AuthView = 'login' | 'signup' | 'forgot'

interface AuthGateProps {
  redirectTo?: string
}

export function AuthGate({ redirectTo }: AuthGateProps) {
  const [view, setView] = useState<AuthView>('login')

  if (view === 'signup') {
    return <SignupForm onSwitch={() => setView('login')} redirectTo={redirectTo} />
  }

  if (view === 'forgot') {
    return <ForgotPasswordForm onBack={() => setView('login')} />
  }

  return <LoginForm onSwitch={() => setView('signup')} onForgot={() => setView('forgot')} redirectTo={redirectTo} />
}
