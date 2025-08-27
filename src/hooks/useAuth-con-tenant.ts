// 'use client'

// import { useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { supabase } from '@/lib/supabase'
// import { tenantService } from '@/lib/tenant'
// import { User } from '@supabase/supabase-js'
// import { Tenant, User as AppUser } from '@prisma/client'

// interface UseAuthOptions {
//     redirectTo?: string
//     requireAuth?: boolean
//     requireTenant?: boolean
// }

// interface AuthState {
//     user: User | null
//     appUser: AppUser | null
//     tenant: Tenant | null
//     loading: boolean
//     error: string | null
// }

// export function useAuth(options: UseAuthOptions = {}) {
//     const {
//         redirectTo = '/login',
//         requireAuth = true,
//         requireTenant = true
//     } = options

//     const [state, setState] = useState<AuthState>({
//         user: null,
//         appUser: null,
//         tenant: null,
//         loading: true,
//         error: null
//     })

//     const router = useRouter()

//     useEffect(() => {
//         const checkAuth = async () => {
//             try {
//                 setState(prev => ({ ...prev, loading: true, error: null }))

//                 const { data: { user } } = await supabase.auth.getUser()

//                 // Si no hay usuario y se requiere auth
//                 if (requireAuth && !user) {
//                     router.push(redirectTo)
//                     return
//                 }

//                 // Si hay usuario pero no se requiere auth (página de login)
//                 if (!requireAuth && user) {
//                     router.push('/dashboard')
//                     return
//                 }

//                 // Si hay usuario, obtener datos del tenant
//                 if (user && requireTenant) {
//                     const tenantResult = await tenantService.getUserTenant(user.id)

//                     if (!tenantResult.success) {
//                         // Usuario sin tenant - redirigir a onboarding
//                         router.push('/tenant/onboarding')
//                         return
//                     }

//                     setState({
//                         user,
//                         appUser: tenantResult.user!,
//                         tenant: tenantResult.tenant!,
//                         loading: false,
//                         error: null
//                     })
//                 } else {
//                     setState({
//                         user,
//                         appUser: null,
//                         tenant: null,
//                         loading: false,
//                         error: null
//                     })
//                 }
//             } catch (error) {
//                 console.error('Auth check error:', error)
//                 setState({
//                     user: null,
//                     appUser: null,
//                     tenant: null,
//                     error: 'Error al verificar autenticación',
//                     loading: false
//                 })
//             }
//         }

//         checkAuth()

//         // Escuchar cambios de auth
//         const { data: { subscription } } = supabase.auth.onAuthStateChange(
//             async (event, session) => {
//                 if (event === 'SIGNED_OUT' && requireAuth) {
//                     setState({
//                         user: null,
//                         appUser: null,
//                         tenant: null,
//                         loading: false,
//                         error: null
//                     })
//                     router.push(redirectTo)
//                 }

//                 if (event === 'SIGNED_IN' && !requireAuth) {
//                     router.push('/dashboard')
//                 }

//                 if (event === 'SIGNED_IN' && session?.user) {
//                     // Recheck tenant when signing in
//                     checkAuth()
//                 }
//             }
//         )

//         return () => subscription.unsubscribe()
//     }, [router, redirectTo, requireAuth, requireTenant])

//     const signOut = async () => {
//         await supabase.auth.signOut()

//         // Limpiar cookies
//         document.cookie.split(';').forEach(cookie => {
//             const eqPos = cookie.indexOf('=')
//             const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
//             if (name.startsWith('sb-')) {
//                 document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
//             }
//         })
//     }

//     /**
//      * Crear tenant después del registro
//      */
//     const createTenantAfterSignup = async (tenantName: string) => {
//         // Obtener usuario actual de Supabase
//         const { data: { user } } = await supabase.auth.getUser()

//         if (!user) {
//             throw new Error('Usuario no autenticado')
//         }

//         setState(prev => ({ ...prev, loading: true, error: null }))

//         const result = await tenantService.createTenantForUser({
//             name: tenantName,
//             userId: user.id,
//             userEmail: user.email || '',
//             firstName: user.user_metadata?.firstName,
//             lastName: user.user_metadata?.lastName
//         })

//         if (result.success) {
//             setState({
//                 user: user,
//                 appUser: result.user!,
//                 tenant: result.tenant!,
//                 loading: false,
//                 error: null
//             })

//             // Redirigir al subdomain
//             window.location.href = `https://${result.subdomain}.${window.location.hostname}/dashboard`
//         } else {
//             setState(prev => ({
//                 ...prev,
//                 error: result.error || 'Error al crear organización',
//                 loading: false
//             }))
//             throw new Error(result.error)
//         }
//     }

//     return {
//         ...state,
//         signOut,
//         createTenantAfterSignup
//     }
// }