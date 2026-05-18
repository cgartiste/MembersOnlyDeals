import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ username: z.string().min(1), password: z.string().min(1) }).parse,
  )
  .handler(async ({ data }) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) throw new Error("ADMIN_PASSWORD non configuré dans les variables d'environnement");
    if (data.password !== adminPassword) throw new Error("Mot de passe incorrect");
    return { ok: true, username: data.username };
  });
