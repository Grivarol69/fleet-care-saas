import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar } from "lucide-react"
import Image from "next/image"

export function NewsSection() {
  const articles = [
    {
      title: "Cómo la IA está revolucionando el mantenimiento de flotas",
      excerpt: "Descubre cómo la inteligencia artificial está transformando la industria del transporte.",
      date: "15 Mar 2024",
      image: "/placeholder-9umpe.png",
    },
    {
      title: "Nuevas regulaciones de emisiones y su impacto",
      excerpt: "Todo lo que necesitas saber sobre las nuevas normativas ambientales para flotas.",
      date: "12 Mar 2024",
      image: "/placeholder-76rh8.png",
    },
    {
      title: "Optimización de rutas: Casos de éxito",
      excerpt: "Casos reales de empresas que han optimizado sus operaciones con Fleet Care.",
      date: "8 Mar 2024",
      image: "/placeholder-slhjw.png",
    },
  ]

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-balance mb-4">Noticias y actualizaciones</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
            Mantente al día con las últimas novedades y tendencias en gestión de flotas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {articles.map((article, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border">
              <CardContent className="p-0">
                <div className="aspect-[3/2] overflow-hidden rounded-t-lg">
                  <Image
                    src={article.image || "/placeholder.svg"}
                    alt={article.title}
                    width={400}
                    height={267}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center text-sm text-muted-foreground mb-3">
                    <Calendar className="w-4 h-4 mr-2" />
                    {article.date}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-balance">{article.title}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{article.excerpt}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline" className="group bg-transparent">
            Ver Todas las Noticias
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  )
}
