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
        console.log('⏭️ No es subdomain, procediendo normal')
    }

    let supabaseResponse = NextResponse.rewrite(url)

    const supabase = createServerClient(
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
    }

    // IMPORTANTE: No remover esta línea
    await supabase.auth.getUser()

    return supabaseResponse
}

function getSubdomain(hostname: string): string | null {
    // For development (localhost)
    if (hostname.includes('localhost')) {
        const parts = hostname.split('.')
        if (parts.length > 1 && parts[0] && parts[0] !== 'localhost') {
            return parts[0]
        }
        return null
    }
    
    // For production
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