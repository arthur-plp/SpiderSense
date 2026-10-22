import { z } from "zod";
import { readBody, route } from "@/lib/server/api";
import { resendActivation } from "@/lib/server/services/auth";
import { emailSchema } from "@/lib/validation";

/** POST /api/auth/resend-activation — new activation link. Same answer whether the account exists or not. */
export const POST = route(async (request) => {
  const parsed = z.object({ email: emailSchema }).safeParse(await readBody(request));
  if (parsed.success) await resendActivation(parsed.data.email);
  return Response.json(
    { message: "Si un compte non activé correspond, un nouveau lien vient d'être envoyé." },
    { status: 202 },
  );
});
