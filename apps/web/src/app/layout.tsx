import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/context/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Business ERP | Intelligent Business Management",
  description: "Manage vendors, clients, products, purchases, sales invoices, expenses, inventory, and reports.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
