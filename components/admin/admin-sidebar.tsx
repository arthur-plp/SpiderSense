import { House, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ApiForm } from "@/components/ui/api-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LOGOUT_ENDPOINT } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/labels";
import { requireStaff } from "@/lib/server/auth";
import { AdminNavLinks, MobileAdminBar } from "./admin-nav";

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 rounded-lg">
      <span className="rounded-full bg-sos px-2 py-1 text-[11px] font-bold tracking-[0.08em] text-white">SOS</span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-white">Spider Sense</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Administration</span>
      </span>
    </Link>
  );
}

/** Reads the session, so it always renders inside a Suspense boundary. */
async function SignedInModerator() {
  const user = await requireStaff();
  const name = `${user.firstName} ${user.lastName}`;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar src={user.avatarUrl} label={name} size={36} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
        <Badge tone={user.role === "ADMIN" ? "brand" : "info"} className="mt-0.5">
          {ROLE_LABELS[user.role]}
        </Badge>
      </div>
    </div>
  );
}

function ModeratorSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="size-9 animate-pulse rounded-full bg-white/10" />
      <span className="flex flex-col gap-1.5">
        <span className="h-3 w-28 animate-pulse rounded bg-white/10" />
        <span className="h-3 w-16 animate-pulse rounded bg-white/5" />
      </span>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="flex flex-col gap-3">
      <Suspense fallback={<ModeratorSkeleton />}>
        <SignedInModerator />
      </Suspense>
      <div className="flex flex-col gap-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100"
        >
          <House className="size-4.5 text-slate-500" aria-hidden />
          Retour au site
        </Link>
        <ApiForm endpoint={LOGOUT_ENDPOINT}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut className="size-4.5 text-slate-500" aria-hidden />
            Se déconnecter
          </button>
        </ApiForm>
      </div>
    </div>
  );
}

/** Dark sidebar on desktop, top bar + menu on mobile. */
export function AdminSidebar() {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/8 bg-ink-900 lg:flex">
        <div className="px-5 pb-4 pt-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <AdminNavLinks />
        </div>
        <div className="border-t border-white/8 p-3">
          <SidebarFooter />
        </div>
      </aside>
      <MobileAdminBar brand={<Brand />} footer={<SidebarFooter />} />
    </>
  );
}
