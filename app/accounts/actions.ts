"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, AccountType } from "@prisma/client";
import { prisma } from "@/lib/db";

const TYPES: readonly AccountType[] = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
];

function fail(message: string): never {
  redirect(`/accounts?error=${encodeURIComponent(message)}`);
}

function isDuplicateName(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

function isMissingRecord(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025"
  );
}

export async function createAccount(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!name) fail("Account name is required.");
  if (!TYPES.includes(type as AccountType)) fail("Pick a valid account type.");
  let duplicate = false;
  try {
    await prisma.account.create({
      data: { name, type: type as AccountType },
    });
  } catch (e) {
    if (isDuplicateName(e)) duplicate = true;
    else throw e;
  }
  if (duplicate) fail(`An account named "${name}" already exists.`);
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function renameAccount(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) fail("Missing account id.");
  if (!name) fail("Account name is required.");
  let duplicate = false;
  let missing = false;
  try {
    await prisma.account.update({ where: { id }, data: { name } });
  } catch (e) {
    if (isDuplicateName(e)) duplicate = true;
    else if (isMissingRecord(e)) missing = true;
    else throw e;
  }
  if (duplicate) fail(`An account named "${name}" already exists.`);
  if (missing) fail("That account no longer exists — reload the page.");
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function setAccountActive(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) fail("Missing account id.");
  let missing = false;
  try {
    await prisma.account.update({ where: { id }, data: { active } });
  } catch (e) {
    if (isMissingRecord(e)) missing = true;
    else throw e;
  }
  if (missing) fail("That account no longer exists — reload the page.");
  revalidatePath("/accounts");
  redirect("/accounts");
}
