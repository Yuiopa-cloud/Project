/**
 * Admin routes skip the storefront layout (see ../(store)/layout.tsx).
 * Full-height neutral backdrop so the dashboard chrome aligns edge-to-edge.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-0px)] bg-[var(--bg)] text-[var(--fg)]">
      {children}
    </div>
  );
}
