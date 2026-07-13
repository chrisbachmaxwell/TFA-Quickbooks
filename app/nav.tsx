"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./login/actions";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  upload: "M12 16V4m0 0 4 4m-4-4-4 4M4 20h16",
  review: "M4 7h16M4 12h10M4 17h7m9-3 2 2-5 5-3 1 1-3 5-5Z",
  accounts: "M4 5h16M4 5v14h16V5M9 5v14m6-9h4m-4 4h4",
  statement: "M7 3h10a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Zm3 5h4m-4 4h4",
  pnl: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  cashflow: "M4 12c2-4 5-4 8 0s6 4 8 0M4 6h4m-4 12h4m12-12h-4m4 12h-4",
};

const SECTIONS: Array<{
  heading: string | null;
  links: Array<{ href: string; label: string; icon: keyof typeof ICONS }>;
}> = [
  {
    heading: null,
    links: [{ href: "/", label: "Dashboard", icon: "home" }],
  },
  {
    heading: "Banking",
    links: [
      { href: "/import", label: "Import statement", icon: "upload" },
      { href: "/transactions", label: "Review transactions", icon: "review" },
    ],
  },
  {
    heading: "Accounting",
    links: [
      { href: "/accounts", label: "Chart of accounts", icon: "accounts" },
      { href: "/journal", label: "Journal entries", icon: "statement" },
    ],
  },
  {
    heading: "Settings",
    links: [{ href: "/settings/users", label: "Users", icon: "accounts" }],
  },
  {
    heading: "Reports",
    links: [
      { href: "/reports", label: "All reports", icon: "accounts" },
      { href: "/reports/balance-sheet", label: "Balance sheet", icon: "statement" },
      { href: "/reports/pnl", label: "Profit & loss", icon: "pnl" },
      { href: "/reports/cash-flow", label: "Cash flow", icon: "cashflow" },
    ],
  },
];

export default function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="brand">
        <span className="brand-mark">T</span> TFA Books
      </div>
      <nav>
        {SECTIONS.map((section, i) => (
          <div className="nav-section" key={i}>
            {section.heading && (
              <div className="nav-heading">{section.heading}</div>
            )}
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${pathname === link.href ? " active" : ""}`}
              >
                <Icon d={ICONS[link.icon]} />
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <form action={logout} className="nav-section">
        <button type="submit" className="nav-link logout" data-testid="logout">
          <Icon d="M15 12H4m0 0 3-3m-3 3 3 3m5-9V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-1" />
          Log out
        </button>
      </form>
    </aside>
  );
}
