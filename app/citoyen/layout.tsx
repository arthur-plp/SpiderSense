import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Espace citoyen", template: "%s · Heros-SOS" },
};

export const viewport: Viewport = {
  themeColor: "#04060d",
  // The citizen app is a full-screen mobile experience (map + gestures).
  viewportFit: "cover",
};

/** Mobile-first column (390×844 reference), centered on larger screens. */
export default function CitizenLayout({ children }: LayoutProps<"/citoyen">) {
  return (
    <div className="flex min-h-dvh justify-center bg-[radial-gradient(60%_50%_at_50%_0%,rgb(30_64_125/0.3),transparent),#020309]">
      <div className="relative min-h-dvh w-full max-w-[430px] overflow-x-clip bg-ink-950 sm:border-x sm:border-white/5 sm:shadow-[0_0_80px_rgb(0_0_0/0.7)]">
        {children}
      </div>
    </div>
  );
}
