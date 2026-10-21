import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Pagination } from "@/components/admin/pagination";
import { AccountBadges, RoleBadge } from "@/components/admin/user-badges";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { formatShortDate, pluralize } from "@/lib/format";
import { REVIEW_STATUS_LABELS, ROLE_LABELS, type Role } from "@/lib/labels";
import { requireStaff } from "@/lib/server/auth";
import { firstParam as first, parsePage } from "@/lib/server/services/admin/params";
import {
  listAdminUsers,
  ROLES,
  USER_STATUSES,
  USERS_PAGE_SIZE,
  type UserStatusFilter,
} from "@/lib/server/services/admin/users";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  await requireStaff();
  const params = await searchParams;
  const role = first(params.role);
  const status = first(params.status);
  const filters = {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    role: ROLES.includes(role as Role) ? (role as Role) : null,
    status: status && status in USER_STATUSES ? (status as UserStatusFilter) : null,
    page: parsePage(params.page),
  };
  const { rows, total } = await listAdminUsers(filters);

  return (
    <>
      <PageHeader
        eyebrow="Comptes"
        title="Utilisateurs"
        description={`${pluralize(total, "compte")} correspondant aux filtres : citoyens, super-héros et équipe de modération.`}
      />

      <FilterForm action="/admin/utilisateurs" className="mb-4">
        <FilterField label="Rechercher" htmlFor="q" className="sm:min-w-72 sm:flex-1">
          <Input name="q" type="search" defaultValue={filters.q} placeholder="Nom, email ou nom de héros…" className="h-10 py-0 text-sm" />
        </FilterField>
        <FilterField label="Rôle" htmlFor="role">
          <Select name="role" defaultValue={filters.role ?? ""} className="h-10 py-0 text-sm">
            <option value="">Tous les rôles</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="État du compte" htmlFor="status">
          <Select name="status" defaultValue={filters.status ?? ""} className="h-10 py-0 text-sm">
            <option value="">Tous</option>
            {Object.entries(USER_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FilterField>
        <Button type="submit" variant="secondary" className="h-10">
          Rechercher
        </Button>
      </FilterForm>

      {rows.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="Aucun utilisateur">
          Aucun compte ne correspond à cette recherche.
        </EmptyState>
      ) : (
        <DataTable caption="Liste des utilisateurs" minWidth={900}>
          <thead>
            <tr>
              <Th>Utilisateur</Th>
              <Th>Email</Th>
              <Th>Rôle</Th>
              <Th>État</Th>
              <Th>Ville</Th>
              <Th>Inscription</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => {
              const name = `${user.firstName} ${user.lastName}`;
              return (
                <Tr key={user.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatarUrl} label={name} size={34} />
                      <div className="min-w-0">
                        <Link href={`/admin/utilisateurs/${user.id}`} className="font-semibold text-slate-100 hover:text-sky-200">
                          {name}
                        </Link>
                        {user.heroAlias && (
                          <p className="text-xs text-slate-400">
                            {user.heroAlias}
                            {user.heroStatus && user.heroStatus !== "APPROVED" && (
                              <Badge tone={user.heroStatus === "PENDING" ? "warning" : "neutral"} className="ml-1.5">
                                Héros : {REVIEW_STATUS_LABELS[user.heroStatus].toLowerCase()}
                              </Badge>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-300">{user.email}</Td>
                  <Td>
                    <RoleBadge role={user.role} />
                  </Td>
                  <Td>
                    <AccountBadges disabledAt={user.disabledAt} emailVerifiedAt={user.emailVerifiedAt} verifiedAt={user.verifiedAt} />
                  </Td>
                  <Td>{user.city}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">{formatShortDate(user.createdAt)}</Td>
                  <Td className="text-right">
                    <LinkButton href={`/admin/utilisateurs/${user.id}`} variant="ghost" size="sm">
                      Profil
                    </LinkButton>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <Pagination pathname="/admin/utilisateurs" params={params} page={filters.page} pageSize={USERS_PAGE_SIZE} total={total} />
    </>
  );
}
