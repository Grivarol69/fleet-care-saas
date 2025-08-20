import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        // Redirect to dashboard - Supabase manejará el resto
        return NextResponse.redirect(requestUrl.origin + '/dashboard')
    }

    // Si no hay code, redirect a login
    return NextResponse.redirect(requestUrl.origin + '/login')
}