import { Card, CardContent } from "@/components/ui/card"
import { Wrench, MapPin, BarChart3, Shield, Clock, Fuel } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Wrench,
      title: "Mantenimiento Predictivo",
      description: "Actualizaciones en tiempo real y análisis avanzado para prevenir fallas antes de que ocurran.",
    },
    {
      icon: MapPin,
      title: "Seguimiento GPS",
      description: "Monitoreo en tiempo real de ubicación y rutas optimizadas para máxima eficiencia.",
    },
    {
      icon: BarChart3,
      title: "Análisis Avanzado",
      description: "Reportes detallados y métricas de rendimiento para tomar decisiones informadas.",
    },
    {
      icon: Shield,
      title: "Gestión de Seguridad",
      description: "Monitoreo de comportamiento del conductor y alertas de seguridad en tiempo real.",
    },
    {
      icon: Clock,
      title: "Programación Inteligente",
      description: "Automatización de mantenimiento y recordatorios para optimizar el tiempo de actividad.",
    },
    {
      icon: Fuel,
      title: "Control de Combustible",
      description: "Seguimiento de consumo y análisis de eficiencia para reducir costos operativos.",
    },
  ]

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            🚀 Funcionalidades
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance mb-6 tracking-tight">
            Nuestras soluciones de <span className="text-primary">gestión de flota</span> incluyen
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Todo lo que necesitas para gestionar tu flota de manera eficiente y rentable en una sola plataforma.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 shadow-lg">
                      <feature.icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-muted-foreground text-pretty leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
