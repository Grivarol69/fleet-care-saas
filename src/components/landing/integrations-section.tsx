import { Database, Smartphone, Headphones, FileText } from 'lucide-react';
import Image from 'next/image';

export function IntegrationsSection() {
  const integrations = [
    {
      icon: Database,
      title: 'Amplia gama de integraciones',
      description:
        'Conecta con tus sistemas ERP, contabilidad y otras herramientas empresariales existentes.',
    },
    {
      icon: Smartphone,
      title: 'Aplicación móvil',
      description:
        'Acceso completo desde dispositivos móviles para conductores y administradores.',
    },
    {
      icon: Headphones,
      title: 'Soporte 24/7',
      description:
        'Nuestro equipo de soporte está disponible cuando lo necesites.',
    },
    {
      icon: FileText,
      title: 'Reportes personalizados',
      description:
        'Genera reportes adaptados a las necesidades específicas de tu negocio.',
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-balance mb-6">
              Compatible con tu negocio
            </h2>
            <div className="space-y-6">
              {integrations.map((integration, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <integration.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {integration.title}
                    </h3>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {integration.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
              <Image
                src="/placeholder-x84m7.png"
                alt="Fleet management dashboard"
                width={600}
                height={450}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
