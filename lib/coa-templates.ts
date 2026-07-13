// Standard charts of accounts, QuickBooks-style. Pure data + helpers.
import type { AccountType } from "./ledger";

export interface TemplateAccount {
  name: string;
  type: AccountType;
  cash?: boolean;
}

export interface CoaTemplate {
  id: string;
  name: string;
  description: string;
  accounts: TemplateAccount[];
}

const A = (name: string, cash = false): TemplateAccount => ({ name, type: "ASSET", cash });
const L = (name: string): TemplateAccount => ({ name, type: "LIABILITY" });
const Q = (name: string): TemplateAccount => ({ name, type: "EQUITY" });
const I = (name: string): TemplateAccount => ({ name, type: "INCOME" });
const E = (name: string): TemplateAccount => ({ name, type: "EXPENSE" });

export const COA_TEMPLATES: CoaTemplate[] = [
  {
    id: "holding",
    name: "Holding & investment company",
    description:
      "For a company that holds shares of businesses and other investments.",
    accounts: [
      A("Checking", true),
      A("Savings", true),
      A("Money Market", true),
      A("Brokerage Investments"),
      A("Private Investments"),
      A("Loans Receivable"),
      L("Credit Card"),
      L("Loans Payable"),
      L("Taxes Payable"),
      Q("Owner Contributions"),
      Q("Owner Draws"),
      Q("Opening Balance Equity"),
      I("Dividend Income"),
      I("Interest Income"),
      I("Capital Gains"),
      I("Rental Income"),
      I("Consulting Income"),
      I("Other Income"),
      E("Accounting & Legal"),
      E("Bank Fees"),
      E("Insurance"),
      E("Interest Expense"),
      E("Investment Fees"),
      E("Meals & Entertainment"),
      E("Office Expenses"),
      E("Professional Services"),
      E("Software & Subscriptions"),
      E("Taxes & Licenses"),
      E("Travel"),
    ],
  },
  {
    id: "small-business",
    name: "General small business",
    description: "A standard chart for a services or product business.",
    accounts: [
      A("Checking", true),
      A("Savings", true),
      A("Accounts Receivable"),
      A("Inventory"),
      A("Equipment"),
      A("Prepaid Expenses"),
      L("Credit Card"),
      L("Accounts Payable"),
      L("Payroll Liabilities"),
      L("Sales Tax Payable"),
      L("Loans Payable"),
      Q("Owner Contributions"),
      Q("Owner Draws"),
      Q("Opening Balance Equity"),
      I("Sales"),
      I("Service Income"),
      I("Shipping Income"),
      I("Other Income"),
      E("Advertising & Marketing"),
      E("Bank Fees"),
      E("Contractors"),
      E("Insurance"),
      E("Interest Expense"),
      E("Meals & Entertainment"),
      E("Office Supplies"),
      E("Payroll"),
      E("Professional Services"),
      E("Rent"),
      E("Repairs & Maintenance"),
      E("Shipping & Postage"),
      E("Software & Subscriptions"),
      E("Taxes & Licenses"),
      E("Travel"),
      E("Utilities"),
    ],
  },
  {
    id: "rental",
    name: "Rental property",
    description: "For owning and renting out real estate.",
    accounts: [
      A("Checking", true),
      A("Property & Buildings"),
      A("Land"),
      A("Improvements"),
      A("Appliances & Equipment"),
      L("Mortgage Payable"),
      L("Security Deposits Held"),
      L("Credit Card"),
      Q("Owner Contributions"),
      Q("Owner Draws"),
      Q("Opening Balance Equity"),
      I("Rental Income"),
      I("Late Fee Income"),
      I("Other Income"),
      E("Advertising"),
      E("Cleaning & Maintenance"),
      E("HOA Dues"),
      E("Insurance"),
      E("Landscaping"),
      E("Management Fees"),
      E("Mortgage Interest"),
      E("Property Taxes"),
      E("Repairs & Maintenance"),
      E("Supplies"),
      E("Utilities"),
    ],
  },
];

export function templateById(id: string): CoaTemplate | undefined {
  return COA_TEMPLATES.find((t) => t.id === id);
}

/** Template accounts the book doesn't have yet (case-insensitive by name). */
export function missingAccounts(
  template: CoaTemplate,
  existingNames: string[],
): TemplateAccount[] {
  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  return template.accounts.filter(
    (a) => !existing.has(a.name.trim().toLowerCase()),
  );
}
