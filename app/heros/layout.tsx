import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroTopBar, TopBarFrame } from "@/components/hero/hero-top-bar";

export const metadata: Metadata = {
  title: { default: "Espace professionnel", template: "%s · Espace héros" },
};

export default function HeroLayout({ children }: LayoutProps<"/heros">) {
  return (
    <div className="relative min-h-dvh bg-ink-950">
      {children}
      <Suspense fallback={<TopBarFrame />}>
        <HeroTopBar />
      </Suspense>
    </div>
  );
}
