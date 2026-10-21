import type { ReactNode } from "react";

/** Content area of the hero space pages (under the floating top bar). */
export function HeroPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(70%_50%_at_80%_0%,rgb(30_64_125/0.35),transparent),radial-gradient(60%_40%_at_0%_100%,rgb(56_189_248/0.08),transparent)]">
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6">{children}</main>
    </div>
  );
}

export function HeroPageSkeleton() {
  return (
    <HeroPage>
      <div className="h-9 w-64 animate-pulse rounded-xl bg-white/5" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    </HeroPage>
  );
}
