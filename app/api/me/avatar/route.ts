import { apiUser, badRequest, check, noContent, readBody, route } from "@/lib/server/api";
import { removeAvatar, setAvatar } from "@/lib/server/services/account";

/** PUT /api/me/avatar — profile picture (multipart/form-data, field `avatar`). */
export const PUT = route(async (request) => {
  const user = await apiUser();
  const { avatar } = await readBody(request);
  if (!(avatar instanceof File) || avatar.size === 0) throw badRequest("Choisissez une image.");
  check(await setAvatar(user.id, avatar));
  return Response.json({ message: "Photo de profil mise à jour." });
});

/** DELETE /api/me/avatar — back to the initials. */
export const DELETE = route(async () => {
  const user = await apiUser();
  await removeAvatar(user.id);
  return noContent();
});
