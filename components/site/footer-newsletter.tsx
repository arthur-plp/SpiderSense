import { MailCheck, Settings } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { hasNewsletterCookie } from "@/lib/server/services/newsletter";
import { NewsletterForm } from "./newsletter-form";
import { accountPathFor } from "./routes";
import { Skeleton } from "./skeleton";

/** Form for anonymous visitors only. Reads cookies: render inside <Suspense>. */
export async function FooterNewsletter() {
  const [user, subscribed] = await Promise.all([getCurrentUser(), hasNewsletterCookie()]);

  if (user) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Settings size={16} className="shrink-0 text-sky-300/80" aria-hidden />
        <span>
          Gérez votre abonnement depuis{" "}
          <Link href={accountPathFor(user)} className="font-medium text-sky-300 underline-offset-2 hover:underline">
            votre compte
          </Link>
          .
        </span>
      </p>
    );
  }

  if (subscribed) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-200">
        <MailCheck size={16} className="shrink-0" aria-hidden />
        Vous êtes inscrit(e) à la newsletter.
      </p>
    );
  }

  return <NewsletterForm />;
}

export function FooterNewsletterSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Skeleton className="h-11 sm:flex-1" />
      <Skeleton className="h-11 sm:w-32" />
    </div>
  );
}
