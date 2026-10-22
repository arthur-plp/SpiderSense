import { Mail, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { NewsletterForm } from "@/components/admin/newsletter-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Panel, SectionTitle, StatTile } from "@/components/ui/panel";
import { formatDateTime, formatNumber, formatShortDate, pluralize } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { listNewsletterHistory, listSubscribers } from "@/lib/server/services/admin/newsletter";

export const metadata: Metadata = { title: "Newsletter" };

export default async function AdminNewsletterPage() {
  await requireStaff();
  const [history, subscribers] = await Promise.all([listNewsletterHistory(), listSubscribers()]);
  const enabled = subscribers.filter((subscriber) => subscriber.isEnabled);

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Newsletter"
        description="Rédigez la lettre mensuelle et envoyez-la à tous les abonnés actifs, ou à un seul abonné pour un test."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel className="p-5 sm:p-6">
          <SectionTitle>Nouvelle newsletter</SectionTitle>
          <NewsletterForm
            endpoint={{ method: "POST", path: "/api/admin/newsletters" }}
            subscribers={enabled.map((subscriber) => ({ id: subscriber.id, email: subscriber.email, name: subscriber.user?.name ?? null }))}
          />
        </Panel>

        <aside className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Abonnés actifs" value={formatNumber(enabled.length)} hint={`${formatNumber(subscribers.length)} inscrits`} />
            <StatTile label="Envois" value={formatNumber(history.length)} hint="depuis le lancement" />
          </div>
          <section aria-labelledby="history-title">
            <SectionTitle>
              <span id="history-title">Historique des envois</span>
            </SectionTitle>
            {history.length === 0 ? (
              <EmptyState icon={<Send className="size-7" />} title="Aucune newsletter envoyée" />
            ) : (
              <ul className="flex flex-col gap-3">
                {history.map((newsletter) => (
                  <li key={newsletter.id}>
                    <Panel className="p-4">
                      <details className="group">
                        <summary className="cursor-pointer list-none">
                          <p className="font-semibold text-slate-100 group-open:text-sky-200">{newsletter.subject}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatDateTime(newsletter.createdAt)}
                            {newsletter.authorName && ` · ${newsletter.authorName}`}
                          </p>
                          <p className="mt-1.5 flex items-center gap-2 text-xs">
                            <Badge tone="info">{pluralize(newsletter.recipients, "destinataire")}</Badge>
                            <span className="text-sky-300 group-open:hidden">Aperçu</span>
                          </p>
                        </summary>
                        <div
                          className="prose-hero mt-3 max-h-80 overflow-y-auto border-t border-white/5 pt-3 text-sm"
                          // Stored after server-side sanitization (lib/server/sanitize.ts).
                          dangerouslySetInnerHTML={{ __html: newsletter.contentHtml }}
                        />
                      </details>
                    </Panel>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section aria-labelledby="subscribers-title" className="mt-8">
        <SectionTitle>
          <span id="subscribers-title">Abonnés ({subscribers.length})</span>
        </SectionTitle>
        {subscribers.length === 0 ? (
          <EmptyState icon={<Mail className="size-7" />} title="Aucun abonné" />
        ) : (
          <DataTable caption="Abonnés à la newsletter" minWidth={640}>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Compte lié</Th>
                <Th>Statut</Th>
                <Th>Inscription</Th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <Tr key={subscriber.id}>
                  <Td className="break-all text-slate-200">{subscriber.email}</Td>
                  <Td>
                    {subscriber.user ? (
                      <Link href={`/admin/utilisateurs/${subscriber.user.id}`} className="text-sky-300 hover:underline">
                        {subscriber.user.name}
                      </Link>
                    ) : (
                      <span className="text-slate-500">Visiteur</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={subscriber.isEnabled ? "success" : "neutral"} dot>
                      {subscriber.isEnabled ? "Actif" : "Suspendu"}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">{formatShortDate(subscriber.subscribedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </>
  );
}
