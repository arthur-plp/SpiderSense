import { Inbox, Mail, Search, X } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/site/container";
import { firstParam } from "@/components/site/params";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { isMailboxEnabled, listMailbox, listMailboxRecipients } from "@/lib/server/services/mailbox";
import { RefreshButton } from "./refresh-button";

export const metadata: Metadata = { title: "Boîte mail" };

// Developer tool: availability is checked before rendering anything, so the
// page answers a real 404 when disabled. It's allowed to block.
export const instant = false;

export default async function MailboxPage({ searchParams }: PageProps<"/dev/mails">) {
  // Read the environment at request time, not when prerendering.
  await connection();
  if (!isMailboxEnabled()) notFound();

  const requested = firstParam((await searchParams).to)?.trim().toLowerCase() ?? "";
  const to = requested && requested.length <= 255 ? requested : null;
  const [mails, recipients] = await Promise.all([listMailbox({ to }), listMailboxRecipients()]);
  const detailQuery = to ? `?to=${encodeURIComponent(to)}` : "";

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        eyebrow="Démo"
        title="Boîte mail de démonstration"
        description="Aucun serveur SMTP n'est configuré : les emails envoyés par Heros-SOS (activation, mot de passe oublié, notifications…) sont conservés ici. Ouvrez-en un pour cliquer sur ses liens."
        actions={<RefreshButton />}
      />

      <div className="panel mb-6 space-y-4 rounded-3xl p-4 sm:p-5">
        <Form action="/dev/mails" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="to" className="sr-only">
            Filtrer par destinataire
          </label>
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
            <Input name="to" type="email" defaultValue={to ?? ""} placeholder="Destinataire, ex. citoyen@heros-sos.test" className="pl-10" />
          </div>
          <Button type="submit" variant="secondary">
            Filtrer
          </Button>
        </Form>
        {recipients.length > 0 && (
          <ul aria-label="Destinataires récents" className="flex flex-wrap gap-2">
            {to && (
              <li>
                <Link href="/dev/mails" className="inline-flex items-center gap-1 rounded-full bg-sky-400 px-3 py-1 text-xs font-semibold text-ink-950">
                  <X size={12} aria-hidden />
                  Tous les destinataires
                </Link>
              </li>
            )}
            {recipients.map((recipient) => {
              const active = recipient.email === to;
              return (
                <li key={recipient.email}>
                  <Link
                    href={`/dev/mails?to=${encodeURIComponent(recipient.email)}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                      active ? "bg-sky-400/20 text-sky-100 ring-sky-300/50" : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10",
                    )}
                  >
                    {recipient.email}
                    <span className="rounded-full bg-black/30 px-1.5 text-[10px] tabular-nums text-slate-400">{recipient.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {mails.length === 0 ? (
        <EmptyState icon={<Inbox size={28} aria-hidden />} title={to ? `Aucun email pour ${to}` : "La boîte est vide"}>
          Les emails apparaissent ici quelques instants après l&apos;action qui les déclenche (inscription, mot de passe oublié…).
        </EmptyState>
      ) : (
        <ul className="panel divide-y divide-white/6 overflow-hidden rounded-3xl">
          {mails.map((mail) => (
            <li key={mail.id}>
              <Link href={`/dev/mails/${mail.id}${detailQuery}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/4 sm:px-5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-300">
                  <Mail size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">{mail.subject}</span>
                  <span className="block truncate text-sm text-slate-400">À : {mail.to}</span>
                </span>
                <RelativeTime value={mail.createdAt} className="shrink-0 text-xs text-slate-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
