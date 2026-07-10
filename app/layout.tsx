import type { Metadata } from "next";
import Nav from "./nav";
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
        <div className="shell">
          <Nav />
          <div className="content">
            <div className="container">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
