"use client";

import { useState } from "react";
import { submitSplit } from "./actions";

interface AccountOption {
  id: string;
  name: string;
  type: string;
}

interface Row {
  accountId: string;
  amount: string;
}

function toCents(s: string): number {
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export default function SplitForm({
  transactionId,
  absAmountCents,
  accounts,
}: {
  transactionId: string;
  absAmountCents: number;
  accounts: AccountOption[];
}) {
  const [rows, setRows] = useState<Row[]>([
    { accountId: "", amount: "" },
    { accountId: "", amount: "" },
  ]);
  const allocated = rows.reduce((s, r) => s + toCents(r.amount), 0);
  const remaining = absAmountCents - allocated;

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form action={submitSplit} data-testid="split-form">
      <input type="hidden" name="transactionId" value={transactionId} />
      <input type="hidden" name="lineCount" value={rows.length} />
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th className="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>
                <select
                  name={`account_${i}`}
                  value={row.accountId}
                  onChange={(e) => update(i, { accountId: e.target.value })}
                  aria-label={`Account for split ${i + 1}`}
                >
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type.toLowerCase()})
                    </option>
                  ))}
                </select>
              </td>
              <td className="amount">
                <input
                  name={`amount_${i}`}
                  value={row.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                  placeholder="0.00"
                  aria-label={`Amount for split ${i + 1}`}
                  style={{ width: 120, textAlign: "right" }}
                />
              </td>
            </tr>
          ))}
          <tr className="total">
            <td>
              <button
                type="button"
                className="secondary"
                onClick={() => setRows((rs) => [...rs, { accountId: "", amount: "" }])}
              >
                + Add line
              </button>
            </td>
            <td
              className="amount"
              data-testid="split-remaining"
              style={remaining === 0 ? {} : { color: "var(--neg)" }}
            >
              Remaining: ${(remaining / 100).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <button type="submit">Post split</button>{" "}
        <span className="muted">
          The parts must add up to the transaction amount.
        </span>
      </p>
    </form>
  );
}
