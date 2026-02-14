import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQSection() {
  const faqs = [
    {
      question: '¿Qué tan rápido puedo empezar a usar Fleet Care?',
      answer:
        'Puedes comenzar inmediatamente después del registro. Nuestro equipo te ayudará con la configuración inicial y la integración de tus vehículos en menos de 24 horas.',
    },
    {
      question: '¿Qué tipos de vehículos son compatibles con Fleet Care?',
      answer:
        'Fleet Care es compatible con todo tipo de vehículos comerciales: camiones, furgonetas, autobuses, maquinaria pesada y vehículos ligeros. Soportamos múltiples marcas y modelos.',
    },
    {
      question: '¿Cómo funciona el mantenimiento predictivo?',
      answer:
        'Utilizamos sensores IoT y algoritmos de IA para analizar datos en tiempo real de tus vehículos. Esto nos permite predecir cuándo un componente necesitará mantenimiento antes de que falle.',
    },
    {
      question: '¿Puedo acceder a Fleet Care desde mi móvil?',
      answer:
        'Sí, tenemos aplicaciones nativas para iOS y Android que te permiten acceder a todas las funcionalidades desde cualquier lugar.',
    },
    {
      question: '¿Qué tipo de soporte ofrecen?',
      answer:
        'Ofrecemos soporte 24/7 a través de chat, email y teléfono. También incluimos capacitación inicial y recursos de ayuda en línea.',
    },
    {
      question: '¿Cómo se integra con mis sistemas existentes?',
      answer:
        'Fleet Care se integra fácilmente con sistemas ERP, software de contabilidad y otras herramientas empresariales a través de APIs y conectores predefinidos.',
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
              ❓ FAQ
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-balance mb-6 tracking-tight">
              Preguntas <span className="text-primary">Frecuentes</span>
            </h2>
            <p className="text-xl text-muted-foreground text-pretty leading-relaxed">
              Encuentra respuestas a las preguntas más comunes sobre Fleet Care.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/80 backdrop-blur-sm border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-2"
              >
                <AccordionTrigger className="text-left hover:no-underline text-lg font-semibold hover:text-primary transition-colors py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-pretty leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
