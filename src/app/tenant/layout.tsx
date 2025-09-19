interface TenantLayoutProps {
  children: React.ReactNode
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}