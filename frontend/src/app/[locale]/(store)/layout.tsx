import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { TopAnnouncementMarquee } from "@/components/top-announcement-marquee";
import { CartDrawer } from "@/components/cart-drawer";
import { SiteFooter } from "@/components/site-footer";

/**
 * Storefront shell only — excludes /admin so the consumer navbar does not stack on the admin UI.
 */
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CartDrawer />
      <div className="flex min-h-dvh min-h-full flex-col">
        <TopAnnouncementMarquee />
        <Suspense
          fallback={
            <div className="h-14 border-b border-[var(--border)] bg-white sm:h-16" />
          }
        >
          <Navbar />
        </Suspense>
        <main className="min-w-0 flex-1 pb-[max(0px,env(safe-area-inset-bottom))]">
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
