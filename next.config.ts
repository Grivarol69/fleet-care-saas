import type { NextConfig } from 'next';

// Bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
    // Optimizaciones básicas

    
    compress: true,
    poweredByHeader: false,

    // Experimental features para Next.js 15
    experimental: {
        // Turbopack ahora es estable, pero se configura diferente
        optimizeCss: true,
        optimizePackageImports: [
            'lucide-react',
            '@radix-ui/react-icons',
            'date-fns',
            '@tanstack/react-table',
            'framer-motion',
        ],
        // Otras optimizaciones experimentales

    },

    // Configuración de imágenes
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "utfs.io",
                port: "",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "uploadthing.com",
                port: "",
                pathname: "/**",
            },
        ],
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },

    // Headers de seguridad
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
        ];
    },

    // Configuración de Webpack optimizada para Next.js 15
    webpack: (config, { dev, isServer }) => {
        // Optimizaciones para producción
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
            };
        }

        // Optimizar el tree shaking
        if (!dev && !isServer) {
            config.optimization = {
                ...config.optimization,
                sideEffects: false,
            };
        }

        // Configuración para archivos SVG
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack'],
        });

        // Optimización para librerías grandes
        config.externals = [...(config.externals || [])];

        // Plugin para analizar el bundle en desarrollo
        if (dev && process.env.ANALYZE === 'true') {
            const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
            config.plugins.push(
                new BundleAnalyzerPlugin({
                    analyzerMode: 'server',
                    analyzerPort: 8888,
                    openAnalyzer: true,
                })
            );
        }

        return config;
    },

    // Configuración para entornos específicos
    env: {
        CUSTOM_KEY: process.env.CUSTOM_KEY || '',
    },

    // Configuración para redirects si es necesario
    async redirects() {
        return [
            // Ejemplo: redirigir rutas antiguas si las tienes
            // {
            //   source: '/old-dashboard',
            //   destination: '/dashboard',
            //   permanent: true,
            // },
        ];
    },

    // Rewrites para API routes si es necesario
    async rewrites() {
        return [
            // Ejemplo de rewrite para API externa
            // {
            //   source: '/api/external/:path*',
            //   destination: 'https://external-api.com/:path*',
            // },
        ];
    },

    // Configuración de TypeScript
    typescript: {
        // Permitir builds en producción incluso con errores de tipos (usar con cuidado)
        ignoreBuildErrors: false,
    },

    // Configuración de ESLint
    eslint: {
        // Ignorar errores de ESLint durante builds (usar con cuidado)
        ignoreDuringBuilds: false,
    },

    // Configuración de salida
    output: 'standalone', // Para optimizar deployments en contenedores
};

export default withBundleAnalyzer(nextConfig);