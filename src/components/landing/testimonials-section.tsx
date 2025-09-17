import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-balance mb-4">Resultados que hablan por sí mismos</h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-border">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-lg text-foreground mb-6 text-pretty">
                &ldquo;Desde que implementamos Fleet Care, hemos reducido nuestros costos de mantenimiento en un 40% y
                eliminado prácticamente el tiempo de inactividad no planificado. La plataforma es intuitiva y los
                reportes nos han ayudado a tomar mejores decisiones.&rdquo;
              </blockquote>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-muted rounded-full mr-4 flex items-center justify-center">
                  <span className="text-sm font-semibold">JM</span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">Juan Martínez</div>
                  <div className="text-sm text-muted-foreground">Director de Operaciones, TransLogística</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
