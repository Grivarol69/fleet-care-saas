import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    console.log('🚀 MIDDLEWARE EJECUTÁNDOSE:', request.nextUrl.pathname, 'HOST:', request.headers.get('host'))
    
    // Multi-tenant subdomain detection
    const url = request.nextUrl.clone()
    const hostname = request.headers.get('host') || ''
    
    // Detect subdomain
    const subdomain = getSubdomain(hostname)
    console.log('🔍 Subdomain detectado:', subdomain)
    
    // Handle tenant routing based on subdomain
    if (subdomain && subdomain !== 'www') {
        console.log('✅ Aplicando routing para tenant:', subdomain)
        // Add tenant info to headers for use in pages/API routes
        url.searchParams.set('tenant', subdomain)
        
        // Rewrite to tenant-specific path
        if (url.pathname === '/') {
            url.pathname = '/tenant'
        } else if (!url.pathname.startsWith('/tenant') && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/_next')) {
            url.pathname = `/tenant${url.pathname}`
        }
        
        console.log('🔄 URL final:', url.pathname, 'Query:', url.searchParams.toString())
    } else {
        console.log('⏭️ No es subdomain, aplicando tenant por defecto para desarrollo')
        // Para localhost y staging sin subdomain, usar tenant por defecto
        if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
            url.searchParams.set('tenant', 'cf68b103-12fd-4208-a352-42379ef3b6e1')
            console.log('🔧 Tenant por defecto aplicado: cf68b103-12fd-4208-a352-42379ef3b6e1')
        }
    }

    let supabaseResponse = NextResponse.rewrite(url)

    createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    supabaseResponse = NextResponse.rewrite(url)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Add tenant to response headers
    if (subdomain) {
        supabaseResponse.headers.set('x-tenant', subdomain)
    } else if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
        supabaseResponse.headers.set('x-tenant', 'cf68b103-12fd-4208-a352-42379ef3b6e1')
    }

    // IMPORTANTE: No remover esta línea
    // await supabase.auth.getUser() // TEMPORALMENTE DESHABILITADO PARA TESTING

    return supabaseResponse
}

function getSubdomain(hostname: string): string | null {
    // For development (localhost)
    if (hostname.includes('localhost')) {
        return null // No subdomains en localhost para MVP
    }

    // For Vercel deployments
    if (hostname.includes('vercel.app')) {
        const parts = hostname.split('.')
        // fleet-care-staging.vercel.app = 3 parts (NO subdomain)
        // tenant.fleet-care-staging.vercel.app = 4 parts (SÍ subdomain)
        if (parts.length > 3 && parts[0]) {
            return parts[0]
        }
        return null
    }

    // For production with custom domain
    const parts = hostname.split('.')
    if (parts.length > 2 && parts[0]) {
        return parts[0]
    }

    return null
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|logo.svg|file.svg|globe.svg|window.svg|yevimaquinas.svg|next.svg|vercel.svg).*)',
    ],
}