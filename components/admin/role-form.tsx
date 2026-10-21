"use client";

import { useActionState } from "react";
import { FormMessage, Select } from "@/components/ui/form";
import { type ActionState, idleState } from "@/lib/action-state";
import { ROLE_LABELS, type Role } from "@/lib/labels";
import { ConfirmSubmit } from "./confirm-submit";

/** Promote / demote an account (administrators only). */
export function RoleForm({
  action,
  role,
  roles,
  userName,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  role: Role;
  roles: Role[];
  userName: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-slate-200">
            Rôle
          </label>
          <Select name="role" defaultValue={role}>
            {roles.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        <ConfirmSubmit
          title="Changer le rôle ?"
          description={`Les droits de ${userName} changent immédiatement. Modérateurs et administrateurs accèdent au dashboard et aux données personnelles des utilisateurs.`}
          confirmLabel="Changer le rôle"
          variant="primary"
          size="md"
        >
          Appliquer
        </ConfirmSubmit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
