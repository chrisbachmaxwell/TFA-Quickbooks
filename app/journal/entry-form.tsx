"use client";

import { useState } from "react";
import { createEntry } from "./actions";

interface AccountOption {
  id: string;
  name: string;
  type: string;
}

interface Row {
  accountId: string;
  debit: string;
  credit: string;
}

function toCents(s: string): number {
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export default function EntryForm({
  accounts,
  today,
}: {
  accounts: AccountOption[];
  today: string;
}) {
  const [rows, setRows] = useState<Row[]>([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ]);
  const debits = rows.reduce((s, r) => s + toCents(r.debit), 0);
  const credits = rows.reduce((s, r) => s + toCents(r.credit), 0);
  const balanced = debits === credits && debits > 0;

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form action={createEntry} data-testid="journal-form">
      <input type="hidden" name="lineCount" value={rows.length} />
      <p className="inline" style={{ display: "flex", gap: 8 }}>
        <label>
          Date <input type="date" name="date" defaultValue={today} required />
        </label>
        <label style={{ flex: 1 }}>
          Memo{" "}
          <input
            name="memo"
            placeholder="What is this entry?"
            required
            style={{ width: "60%" }}
          />
        </label>
      </p>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th className="amount">Debit</th>
            <th className="amount">Credit</th>
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
                  aria-label={`Account for line ${i + 1}`}
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
                  name={`debit_${i}`}
                  value={row.debit}
                  onChange={(e) => update(i, { debit: e.target.value })}
                  placeholder="0.00"
                  aria-label={`Debit for line ${i + 1}`}
                  style={{ width: 110, textAlign: "right" }}
                />
              </td>
              <td className="amount">
                <input
                  name={`credit_${i}`}
                  value={row.credit}
                  onChange={(e) => update(i, { credit: e.target.value })}
                  placeholder="0.00"
                  aria-label={`Credit for line ${i + 1}`}
                  style={{ width: 110, textAlign: "right" }}
                />
              </td>
            </tr>
          ))}
          <tr className="total">
            <td>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setRows((rs) => [...rs, { accountId: "", debit: "", credit: "" }])
                }
              >
                + Add line
              </button>
            </td>
            <td className="amount" data-testid="journal-debits">
              ${(debits / 100).toFixed(2)}
            </td>
            <td className="amount" data-testid="journal-credits">
              ${(credits / 100).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <button type="submit">Post entry</button>{" "}
        <span
          className={balanced ? "muted" : ""}
          style={balanced ? {} : { color: "var(--neg)" }}
          data-testid="journal-balance-hint"
        >
          {balanced
            ? "Balanced ✓"
            : "Debits and credits must match before this will post."}
        </span>
      </p>
    </form>
  );
}
