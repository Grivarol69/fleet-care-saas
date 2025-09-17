export function StatsSection() {
  const stats = [
    {
      value: "85%",
      label: "Reducción en costos de mantenimiento",
      description: "Nuestros clientes ahorran en promedio",
    },
    {
      value: "50%",
      label: "Menos tiempo de inactividad",
      description: "Mantenimiento predictivo efectivo",
    },
    {
      value: "30%",
      label: "Mejora en eficiencia de combustible",
      description: "Optimización de rutas y conducción",
    },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            📊 Resultados
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance mb-6 tracking-tight">
            Útil para tu <span className="text-primary">negocio</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Nuestras tecnologías avanzadas entregan resultados reales que impulsan tu negocio hacia adelante.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="mb-6">
                  <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {stat.label}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
