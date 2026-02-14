import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-24 sm:py-32 lg:py-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
                  ✨ Fleet Care
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-balance leading-[1.1] tracking-tight">
                  Controla tu flota{' '}
                  <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    como nunca antes
                  </span>
                </h1>
              </div>
              <p className="text-xl text-muted-foreground text-pretty max-w-2xl leading-relaxed">
                Seguimiento en tiempo real, análisis avanzado y gestión de
                mantenimiento sin esfuerzo, todo en una plataforma potente e
                intuitiva.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button
                  size="lg"
                  className="group h-14 px-8 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Comenzar Gratis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="group h-14 px-8 text-base font-semibold rounded-xl border-2 hover:bg-muted/50 transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Ver Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted shadow-2xl">
              <Image
                src="/images/frangers-1.png"
                alt="Fleet of modern trucks on highway"
                width={800}
                height={600}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-white/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    15 vehículos en línea
                  </p>
                  <p className="text-xs text-muted-foreground">Tiempo real</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
