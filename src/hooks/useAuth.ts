'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface UseAuthOptions {
    redirectTo?: string
    requireAuth?: boolean
}

export function useAuth(options: UseAuthOptions = {}) {
    const { redirectTo = '/login', requireAuth = true } = options
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (requireAuth && !user) {
                router.push(redirectTo)
                return
            }

            if (!requireAuth && user) {
                router.push('/dashboard')
                return
            }

            setUser(user)
            setLoading(false)
        }

        checkAuth()

        // Escuchar cambios de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_OUT' && requireAuth) {
                    router.push(redirectTo)
                }
                if (event === 'SIGNED_IN' && !requireAuth) {
                    router.push('/dashboard')
                }
                setUser(session?.user ?? null)
            }
        )

        return () => subscription.unsubscribe()
    }, [router, redirectTo, requireAuth])

    const signOut = async () => {
        await supabase.auth.signOut()

        // Limpiar cookies
        document.cookie.split(';').forEach(cookie => {
            const eqPos = cookie.indexOf('=')
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            if (name.startsWith('sb-')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
            }
        })
    }

    return { user, loading, signOut }
}