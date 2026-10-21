import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration Spider Sense" },
  robots: { index: false, follow: false },
};

// The session is read inside Suspense boundaries (sidebar badge, pages):
// the layout itself never waits for it.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-ink-950 lg:flex-row">
      <AdminSidebar />
      <main id="contenu" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
