import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 760, margin: "80px auto", padding: 24 }}>
      <p>Mini Business ERP</p>
      <h1>Purchases, sales, inventory, and financial reports.</h1>
      <p>Starter monorepo scaffold for the full-stack assessment.</p>
      <Link href="/dashboard">Open dashboard</Link>
    </main>
  );
}
