import { prisma } from "@/lib/db";
import type { Account } from "@prisma/client";
import {
  createAccount,
  installStarterAccounts,
  renameAccount,
  setAccountActive,
  setAccountCash,
} from "./actions";

export const dynamic = "force-dynamic";

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

const TYPE_SECTIONS: Record<string, string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

function AccountRow({ account }: { account: Account }) {
  return (
    <tr data-testid="account-row" data-name={account.name}>
      <td>
        <form action={renameAccount} className="inline">
          <input type="hidden" name="id" value={account.id} />
          <input
            name="name"
            defaultValue={account.name}
            aria-label={`Name of ${account.name}`}
          />
          <button type="submit" className="secondary">
            Rename
          </button>
        </form>
      </td>
      <td>
        <span className={`badge ${account.type.toLowerCase()}`}>
          {TYPE_LABELS[account.type]}
        </span>{" "}
        {account.cash && <span className="badge asset">Cash</span>}
      </td>
      <td>
        <span
          className={`badge ${account.active ? "status-active" : "status-inactive"}`}
        >
          {account.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td style={{ textAlign: "right" }}>
        <a href={`/accounts/${account.id}`}>Register</a>{" "}
        {account.type === "ASSET" && (
          <form action={setAccountCash} className="inline">
            <input type="hidden" name="id" value={account.id} />
            <input
              type="hidden"
              name="cash"
              value={account.cash ? "false" : "true"}
            />
            <button type="submit" className="secondary">
              {account.cash ? "Unmark cash" : "Mark as cash"}
            </button>
          </form>
        )}{" "}
        <form action={setAccountActive} className="inline">
          <input type="hidden" name="id" value={account.id} />
          <input
            type="hidden"
            name="active"
            value={account.active ? "false" : "true"}
          />
          <button type="submit" className="secondary">
            {account.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </td>
    </tr>
  );
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const accounts = await prisma.account.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Chart of accounts</h1>
          <p className="page-subtitle">
            The categories every dollar in your books lives in.
          </p>
        </div>
      </div>

      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}

      <div className="card">
        <p className="card-title">New account</p>
        <form action={createAccount} className="inline" data-testid="new-account-form">
          <input name="name" placeholder="Account name" required />
          <select name="type" required defaultValue="ASSET">
            {TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          <label className="muted" style={{ border: "none", padding: 0 }}>
            <input type="checkbox" name="cash" defaultChecked /> bank/cash
            account (Asset only)
          </label>
          <button type="submit">Create account</button>
        </form>
      </div>

      {accounts.length === 0 ? (
        <div className="card empty-state">
          <div className="glyph">🗂️</div>
          <p>
            <strong>No accounts yet.</strong>
          </p>
          <p>
            Create the first one above — or install a sensible starter set for
            a holding company and rename from there.
          </p>
          <form action={installStarterAccounts}>
            <button type="submit" data-testid="starter-accounts">
              Add starter accounts
            </button>
          </form>
        </div>
      ) : (
        TYPE_ORDER.map((type) => {
          const group = accounts.filter((a) => a.type === type);
          if (group.length === 0) return null;
          return (
            <div key={type}>
              <h2>{TYPE_SECTIONS[type]}</h2>
              <div className="card flush">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((account) => (
                      <AccountRow key={account.id} account={account} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
