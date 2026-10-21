"use client";

import { type Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "./cn";

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
];

/** The empty document is posted as "" so "required" checks stay simple. */
const serialize = (editor: Editor) => (editor.isEmpty ? "" : editor.getHTML());

type RichTextEditorProps = {
  /** Name of the hidden input carrying the HTML. */
  name: string;
  label: ReactNode;
  defaultValue?: string;
  errors?: string[];
  hint?: ReactNode;
  className?: string;
};

type ToolbarButton = {
  label: string;
  icon: LucideIcon;
  isActive?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
  isDisabled?: (editor: Editor) => boolean;
};

function editLink(editor: Editor) {
  const previous = editor.getAttributes("link").href as string | undefined;
  const input = window.prompt("Adresse du lien (https://… ou mailto:…). Laissez vide pour retirer le lien.", previous ?? "https://");
  if (input === null) return;
  const href = input.trim();
  const chain = editor.chain().focus().extendMarkRange("link");
  if (!href || href === "https://") {
    chain.unsetLink().run();
  } else if (editor.state.selection.empty && !editor.isActive("link")) {
    // Nothing selected: insert the address itself as the link text.
    chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
  } else {
    chain.setLink({ href }).run();
  }
}

const BUTTONS: (ToolbarButton | "separator")[] = [
  { label: "Gras", icon: Bold, isActive: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
  { label: "Italique", icon: Italic, isActive: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
  "separator",
  {
    label: "Titre de section",
    icon: Heading2,
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Sous-titre",
    icon: Heading3,
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  "separator",
  { label: "Liste à puces", icon: List, isActive: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
  {
    label: "Liste numérotée",
    icon: ListOrdered,
    isActive: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  { label: "Citation", icon: Quote, isActive: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Lien", icon: Link2, isActive: (e) => e.isActive("link"), run: editLink },
  "separator",
  { label: "Annuler", icon: Undo2, run: (e) => e.chain().focus().undo().run(), isDisabled: (e) => !e.can().undo() },
  { label: "Rétablir", icon: Redo2, run: (e) => e.chain().focus().redo().run(), isDisabled: (e) => !e.can().redo() },
];

/**
 * Tiptap editor for blog articles and newsletters. The HTML travels in a
 * hidden input; the server sanitizes it before storing it.
 */
export function RichTextEditor({ name, label, defaultValue = "", errors, hint, className }: RichTextEditorProps) {
  const [html, setHtml] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestDefault = useRef(defaultValue);
  const labelId = useId();
  const messageId = useId();
  const invalid = Boolean(errors?.length);

  const described = invalid || Boolean(hint);
  // Stable object: useEditor re-applies options whenever they change identity.
  const editorProps = useMemo(
    () => ({
      attributes: {
        class: "prose-hero min-h-64 px-4 py-3 text-[0.9375rem] outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        ...(described ? { "aria-describedby": messageId } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
      },
    }),
    [described, invalid, labelId, messageId],
  );

  const editor = useEditor({
    extensions,
    content: defaultValue,
    immediatelyRender: false,
    editorProps,
    onUpdate: ({ editor: current }) => setHtml(serialize(current)),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? BUTTONS.map((button) =>
            button === "separator" ? null : { active: button.isActive?.(current) ?? false, disabled: button.isDisabled?.(current) ?? false },
          )
        : null,
  });

  // After a failed submission the form comes back with the submitted HTML as default.
  useEffect(() => {
    latestDefault.current = defaultValue;
    if (editor && !editor.isDestroyed && serialize(editor) !== defaultValue) editor.commands.setContent(defaultValue);
  }, [editor, defaultValue]);

  // React resets the form after a successful action (e.g. newsletter sent): follow it.
  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form || !editor) return;
    const onReset = () => {
      // The reset happens during commit, before effects receive the new defaultValue.
      setTimeout(() => {
        if (!editor.isDestroyed && serialize(editor) !== latestDefault.current) editor.commands.setContent(latestDefault.current);
      }, 0);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [editor]);

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-1.5", className)}>
      <p id={labelId} className="text-sm font-medium text-slate-200">
        {label}
      </p>
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-[rgb(4_8_18/0.6)] transition-[border-color,box-shadow] focus-within:border-sky-400/70 focus-within:shadow-[0_0_0_3px_rgb(56_189_248/0.18)]",
          invalid ? "border-rose-400/80" : "border-slate-400/20",
        )}
      >
        <div
          role="toolbar"
          aria-label="Mise en forme"
          className="flex flex-wrap items-center gap-0.5 border-b border-white/8 bg-white/[0.03] px-1.5 py-1"
        >
          {BUTTONS.map((button, index) => {
            if (button === "separator") return <span key={index} className="mx-1 h-5 w-px bg-white/10" aria-hidden />;
            const Icon = button.icon;
            const status = state?.[index];
            const toggle = Boolean(button.isActive);
            return (
              <button
                key={button.label}
                type="button"
                title={button.label}
                aria-label={button.label}
                aria-pressed={toggle ? Boolean(status?.active) : undefined}
                disabled={!editor || status?.disabled}
                onClick={() => editor && button.run(editor)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/8 hover:text-slate-100 disabled:pointer-events-none disabled:opacity-35",
                  status?.active && "bg-sky-400/15 text-sky-200",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="min-h-64 px-4 py-3 text-sm text-slate-500" aria-hidden>
            Chargement de l&apos;éditeur…
          </div>
        )}
      </div>
      <input type="hidden" name={name} value={html} />
      {errors?.length ? (
        <p id={messageId} className="text-xs font-medium text-rose-300">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
