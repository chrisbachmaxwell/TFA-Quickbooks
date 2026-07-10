import { prisma } from "@/lib/db";
import { createAccount, renameAccount, setAccountActive } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

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
      <h1>Chart of accounts</h1>
      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>New account</h2>
        <form action={createAccount} className="inline" data-testid="new-account-form">
          <input name="name" placeholder="Account name" required />
          <select name="type" required defaultValue="ASSET">
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit">Create account</button>
        </form>
      </div>

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
          {accounts.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No accounts yet — create the first one above.
              </td>
            </tr>
          )}
          {accounts.map((account) => (
            <tr
              key={account.id}
              data-testid="account-row"
              data-name={account.name}
            >
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
              <td>{TYPE_LABELS[account.type]}</td>
              <td>{account.active ? "Active" : "Inactive"}</td>
              <td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
