'use server'

import { createClient } from '@/lib/supabase/server'

interface UpdateProfileData {
  phone?: string
  home_address?: string
}

export async function updateProfile(data: UpdateProfileData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      phone: data.phone || null,
      home_address: data.home_address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { error: 'Failed to update profile. Please try again.' }
  }

  return { success: true }
}
