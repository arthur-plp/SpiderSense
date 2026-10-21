import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/** Public website and authentication pages: header + footer around every page. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-sky-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Aller au contenu
      </a>
      {/* Night-sky glow shared by every page. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-184 overflow-hidden">
        <div className="absolute left-1/2 -top-88 h-160 w-288 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(56_189_248/0.18),transparent)]" />
        <div className="absolute -right-48 top-40 h-104 w-104 rounded-full bg-[radial-gradient(closest-side,rgb(99_102_241/0.14),transparent)]" />
      </div>
      <SiteHeader />
      <main id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
