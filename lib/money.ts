// All money in this app is integer cents. These are the only two places
// where cents meet human-readable strings.

export function parseAmountToCents(raw: string): number {
  let s = raw.trim();
  if (s === "") throw new Error("empty amount");
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\$/g, "").replace(/,/g, "").trim();
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    throw new Error(`unparseable amount: "${raw}"`);
  }
  const [whole, frac = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return negative ? -cents : cents;
}

export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error(`not integer cents: ${cents}`);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const rem = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars}.${rem}`;
}
