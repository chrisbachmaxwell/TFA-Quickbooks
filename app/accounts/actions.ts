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
  const cash = type === "ASSET" && formData.get("cash") === "on";
  if (!name) fail("Account name is required.");
  if (!TYPES.includes(type as AccountType)) fail("Pick a valid account type.");
  let duplicate = false;
  try {
    await prisma.account.create({
      data: { name, type: type as AccountType, cash },
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

const STARTER_ACCOUNTS: Array<{
  name: string;
  type: AccountType;
  cash?: boolean;
}> = [
  { name: "Checking", type: "ASSET", cash: true },
  { name: "Savings", type: "ASSET", cash: true },
  { name: "Investments", type: "ASSET" },
  { name: "Credit Card", type: "LIABILITY" },
  { name: "Owner Contributions", type: "EQUITY" },
  { name: "Owner Draws", type: "EQUITY" },
  { name: "Dividend Income", type: "INCOME" },
  { name: "Interest Income", type: "INCOME" },
  { name: "Capital Gains", type: "INCOME" },
  { name: "Consulting Income", type: "INCOME" },
  { name: "Accounting & Legal", type: "EXPENSE" },
  { name: "Bank Fees", type: "EXPENSE" },
  { name: "Insurance", type: "EXPENSE" },
  { name: "Office Expenses", type: "EXPENSE" },
  { name: "Software & Subscriptions", type: "EXPENSE" },
  { name: "Taxes & Licenses", type: "EXPENSE" },
  { name: "Travel", type: "EXPENSE" },
];

export async function installStarterAccounts(): Promise<void> {
  const existing = await prisma.account.count();
  if (existing > 0) {
    fail("Starter accounts are only for an empty chart of accounts.");
  }
  await prisma.account.createMany({
    data: STARTER_ACCOUNTS.map((a) => ({
      name: a.name,
      type: a.type,
      cash: a.cash ?? false,
    })),
  });
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function setAccountCash(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const cash = String(formData.get("cash") ?? "") === "true";
  if (!id) fail("Missing account id.");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) fail("That account no longer exists — reload the page.");
  if (account.type !== "ASSET") fail("Only asset accounts can be cash accounts.");
  await prisma.account.update({ where: { id }, data: { cash } });
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
