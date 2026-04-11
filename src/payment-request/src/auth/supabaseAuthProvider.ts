import { supabaseAuthProvider } from 'ra-supabase'
import { supabase } from 'src/providers/supabaseClient'

type AppIdentity = {
  id: string
  fullName: string
  avatar?: string
  email?: string
  phone?: string | null
}

const isPublicPath = (pathname: string) =>
  pathname.startsWith('/request/')
  || pathname.startsWith('/demo')
  || pathname === '/auth/callback'

const baseAuthProvider = supabaseAuthProvider(supabase, {
  getIdentity: async (user): Promise<AppIdentity> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, phone')
      .eq('id', user.id)
      .maybeSingle()

    return {
      id: user.id,
      fullName: profile?.display_name ?? user.email ?? '',
      avatar: profile?.avatar_url ?? undefined,
      email: user.email ?? undefined,
      phone: profile?.phone ?? null,
    }
  },
  getPermissions: async (user) => user.id,
})

export const authProvider = {
  ...baseAuthProvider,
  async login(params: { email?: string }) {
    if (!params.email) {
      throw new Error('Email is required')
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: params.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw error
    }
  },
  async checkAuth() {
    if (isPublicPath(window.location.pathname)) {
      return
    }

    return baseAuthProvider.checkAuth({})
  },
}
