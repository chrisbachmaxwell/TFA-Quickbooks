import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "TFA Books",
  description: "Double-entry accounting for TFA",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav>
          <span className="brand">TFA Books</span>
          <Link href="/accounts">Chart of accounts</Link>
          <Link href="/import">Import statement</Link>
          <Link href="/transactions">Transactions</Link>
          <Link href="/reports/balance-sheet">Balance sheet</Link>
          <Link href="/reports/pnl">Profit &amp; loss</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
