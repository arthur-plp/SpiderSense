"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { useApiForm } from "@/lib/use-api-form";

const SIZE = 320;

/** Square-crops and downsizes the picture in the browser before upload. */
async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("resize"))), "image/jpeg", 0.85));
}

export function AvatarForm({ avatarUrl, label }: { avatarUrl: string | null; label: string }) {
  const [state, action, pending] = useApiForm({ method: "PUT", path: "/api/me/avatar" });
  const [preview, setPreview] = useState<string | null>(null);
  const [, removeAction] = useApiForm({ method: "DELETE", path: "/api/me/avatar" }, () => setPreview(null));
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const blob = await resize(file).catch(() => file);
    setPreview(URL.createObjectURL(blob));
    const data = new FormData();
    data.set("avatar", new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" }));
    startTransition(() => action(data));
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar src={preview ?? avatarUrl} label={label} size={88} />
      <div className="flex flex-col gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar-input" onChange={(event) => void onFile(event.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => input.current?.click()}>
            <Camera className="size-4" aria-hidden />
            {pending ? "Envoi…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
          </Button>
          {avatarUrl && (
            <form action={removeAction}>
              <Button type="submit" variant="ghost" size="sm">
                <Trash2 className="size-4" aria-hidden />
                Retirer
              </Button>
            </form>
          )}
        </div>
        <p className="text-xs text-slate-500">JPEG, PNG ou WebP. L&apos;image est recadrée en carré.</p>
        <FormMessage state={state} />
      </div>
    </div>
  );
}
