"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth";

function fail(message: string): never {
  redirect(`/settings/users?error=${encodeURIComponent(message)}`);
}

export async function addUser(formData: FormData): Promise<void> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email || !email.includes("@")) fail("Enter a valid email address.");
  const existing = await prisma.authorizedUser.findUnique({ where: { email } });
  if (existing) fail(`${email} is already authorized.`);
  await prisma.authorizedUser.create({ data: { email } });
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function removeUser(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) fail("Missing user id.");
  const count = await prisma.authorizedUser.count();
  if (count <= 1) {
    fail("You can't remove the last authorized user — you'd lock everyone out.");
  }
  await prisma.authorizedUser.delete({ where: { id } }).catch(() => {
    fail("That user no longer exists — reload the page.");
  });
  revalidatePath("/settings/users");
  redirect("/settings/users");
}
