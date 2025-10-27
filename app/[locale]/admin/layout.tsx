// Admin layout - no auth check here to allow login page access
// Individual pages handle their own authentication
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

