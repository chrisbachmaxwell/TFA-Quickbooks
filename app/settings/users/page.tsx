import { prisma } from "@/lib/db";
import { addUser, removeUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const users = await prisma.authorizedUser.findMany({
    orderBy: { email: "asc" },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Authorized users</h1>
          <p className="page-subtitle">
            Only these email addresses can request a sign-in link.
          </p>
        </div>
      </div>

      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}

      <div className="card">
        <p className="card-title">Add a user</p>
        <form action={addUser} className="inline" data-testid="add-user-form">
          <input
            type="email"
            name="email"
            placeholder="person@example.com"
            required
            style={{ minWidth: 280 }}
          />
          <button type="submit">Authorize</button>
        </form>
      </div>

      <div className="card flush">
        <table data-testid="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} data-testid="user-row">
                <td>{user.email}</td>
                <td className="muted">
                  {user.createdAt.toISOString().slice(0, 10)}
                </td>
                <td style={{ textAlign: "right" }}>
                  <form action={removeUser} className="inline">
                    <input type="hidden" name="id" value={user.id} />
                    <button type="submit" className="secondary">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Removing a user takes effect for new sign-ins immediately (outstanding
        links die too); a session they already hold expires on its own within
        30 days.
      </p>
    </div>
  );
}
