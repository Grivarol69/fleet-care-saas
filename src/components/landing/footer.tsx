import { Button } from "@/components/ui/button"
import { Truck } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* CTA Section */}
        <div className="py-16 text-center border-b border-background/20">
          <h2 className="text-3xl font-bold text-balance mb-4">¿Listo para optimizar tu flota?</h2>
          <p className="text-background/80 mb-8 max-w-2xl mx-auto text-pretty">
            Únete a cientos de empresas que ya confían en Fleet Care para gestionar sus flotas de manera eficiente.
          </p>
          <Button size="lg" variant="secondary">
            Comenzar Prueba Gratuita
          </Button>
        </div>

        {/* Footer Links */}
        <div className="py-12 grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-6 w-6" />
              <span className="text-lg font-bold">Fleet Care</span>
            </div>
            <p className="text-background/80 text-sm text-pretty">
              La plataforma líder en gestión y mantenimiento de flotas vehiculares.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Producto</h3>
            <ul className="space-y-2 text-sm text-background/80">
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Características
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Integraciones
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm text-background/80">
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Nosotros
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Carreras
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Noticias
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Soporte</h3>
            <ul className="space-y-2 text-sm text-background/80">
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Centro de Ayuda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Documentación
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Estado del Sistema
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-background transition-colors">
                  Seguridad
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="py-6 border-t border-background/20 text-center text-sm text-background/60">
          © 2024 Fleet Care. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
