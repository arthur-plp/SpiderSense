import { ArrowLeft, Clock, FileText, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/site/container";
import { firstParam } from "@/components/site/params";
import { RelativeTime } from "@/components/ui/relative-time";
import { getMailboxMessage, isMailboxEnabled } from "@/lib/server/services/mailbox";

export const metadata: Metadata = { title: "Email" };

// Developer tool, see ../page.tsx.
export const instant = false;

/**
 * Links in the email must leave the sandboxed iframe: opened in a new tab,
 * they escape the sandbox (allow-popups-to-escape-sandbox) and work normally.
 */
function withLinksInNewTab(html: string): string {
  const base = '<base target="_blank">';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (head) => `${head}${base}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${base}</head>`);
  return `${base}${html}`;
}

export default async function MailPage({ params, searchParams }: PageProps<"/dev/mails/[id]">) {
  await connection();
  if (!isMailboxEnabled()) notFound();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const mail = await getMailboxMessage(id);
  if (!mail) notFound();
  const to = firstParam(query.to);
  const backHref = to ? `/dev/mails?to=${encodeURIComponent(to)}` : "/dev/mails";

  return (
    <Container className="py-8 sm:py-12">
      <Link href={backHref} className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white">
        <ArrowLeft size={16} aria-hidden />
        Retour à la boîte mail
      </Link>

      <header className="mt-5">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{mail.subject}</h1>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <dt>
              <User size={14} aria-hidden />
              <span className="sr-only">Destinataire</span>
            </dt>
            <dd className="break-all text-slate-200">{mail.to}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt>
              <Clock size={14} aria-hidden />
              <span className="sr-only">Envoyé</span>
            </dt>
            <dd>
              <RelativeTime value={mail.createdAt} />
            </dd>
          </div>
        </dl>
      </header>

      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-ink-950">
        <iframe
          title={`Contenu de l'email « ${mail.subject} »`}
          srcDoc={withLinksInNewTab(mail.html)}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer"
          className="block h-[70vh] min-h-128 w-full"
        />
      </div>

      <details className="panel mt-6 rounded-2xl">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white">
          <FileText size={16} aria-hidden />
          Version texte
        </summary>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words border-t border-white/10 px-4 py-4 font-mono text-xs leading-relaxed text-slate-300">
          {mail.text}
        </pre>
      </details>
    </Container>
  );
}
