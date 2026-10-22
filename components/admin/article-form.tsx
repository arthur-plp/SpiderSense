"use client";

import { useState } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ApiEndpoint } from "@/lib/api-client";
import { useApiForm } from "@/lib/use-api-form";
import { slugify } from "./slug";

export type ArticleFormDefaults = {
  title: string;
  slug: string;
  coverUrl: string | null;
  contentHtml: string;
  status: "DRAFT" | "PUBLISHED";
};

export function ArticleForm({
  endpoint,
  article,
}: {
  endpoint: ApiEndpoint;
  article?: ArticleFormDefaults;
}) {
  const [state, formAction] = useApiForm(endpoint);
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const [title, setTitle] = useState(values?.title ?? article?.title ?? "");
  const suggestedSlug = slugify(title) || "mon-article";

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field label="Titre" name="title" errors={errors.title}>
        <Input
          name="title"
          defaultValue={values?.title ?? article?.title ?? ""}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={255}
          required
          invalid={Boolean(errors.title)}
          className="text-lg font-semibold"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
        <Field
          label="Slug (adresse de l'article)"
          name="slug"
          errors={errors.slug}
          hint={
            article
              ? "Modifier le slug d'un article publié casse les liens déjà partagés."
              : `Laissez vide pour utiliser « ${suggestedSlug} ».`
          }
        >
          <div className="flex items-center rounded-xl">
            <span className="hidden shrink-0 pr-2 text-sm text-slate-500 sm:inline">/blog/</span>
            <Input
              name="slug"
              defaultValue={values?.slug ?? article?.slug ?? ""}
              placeholder={suggestedSlug}
              maxLength={255}
              invalid={Boolean(errors.slug)}
              className="font-mono text-sm"
            />
          </div>
        </Field>
        <Field label="Statut" name="status" errors={errors.status}>
          <Select name="status" defaultValue={values?.status ?? article?.status ?? "DRAFT"} invalid={Boolean(errors.status)}>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
          </Select>
        </Field>
      </div>
      <Field label="Image de couverture (URL)" name="coverUrl" errors={errors.coverUrl} hint="Facultatif. Adresse http(s) d'une image.">
        <Input
          name="coverUrl"
          type="url"
          inputMode="url"
          defaultValue={values?.coverUrl ?? article?.coverUrl ?? ""}
          invalid={Boolean(errors.coverUrl)}
        />
      </Field>
      <RichTextEditor
        name="contentHtml"
        label="Contenu"
        defaultValue={values?.contentHtml ?? article?.contentHtml ?? ""}
        errors={errors.contentHtml}
      />
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{article ? "Enregistrer l'article" : "Créer l'article"}</SubmitButton>
      </div>
    </form>
  );
}
