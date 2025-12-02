import { CreateOrganization } from '@clerk/nextjs'

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido a Fleet Care
        </h1>
        <p className="mt-2 text-gray-600">
          Crea una organización para comenzar a gestionar tu flota
        </p>
      </div>

      <CreateOrganization
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl',
          },
        }}
        afterCreateOrganizationUrl="/dashboard"
      />
    </div>
  )
}
