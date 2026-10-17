import "dotenv/config";
import { PrismaClient, PartyType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // 1. Seed Business Profile
  console.log("🏢 Seeding BusinessProfile...");
  const existingProfile = await prisma.businessProfile.findFirst();
  const businessProfileData = {
    companyName: "Mini Business ERP",
    legalName: "Mini Business ERP Technologies Ltd.",
    logoUrl: "https://images.unsplash.com/photo-1554774853-d50f9c681ae2?auto=format&fit=crop&w=300&q=80",
    email: "contact@minibusinesserp.com",
    mobile: "+880 1700-123456",
    phone: "+880 2 9876543",
    website: "https://minibusinesserp.com",
    address: "House 42, Road 11, Block D, Banani",
    city: "Dhaka",
    state: "Dhaka Division",
    postalCode: "1213",
    country: "Bangladesh",
    taxNumber: "BIN-123456789-001",
    tradeLicenseNo: "TRAD/DNCC/023451/2026",
    currency: "BDT",
    invoicePrefix: "INV",
    purchasePrefix: "PUR",
    invoiceFooter: "Thank you for your business! All goods are subject to standard warranty.",
  };

  const businessProfile = existingProfile
    ? await prisma.businessProfile.update({
        where: { id: existingProfile.id },
        data: businessProfileData,
      })
    : await prisma.businessProfile.create({
        data: businessProfileData,
      });
  console.log(`✓ BusinessProfile: ${businessProfile.companyName} (${businessProfile.currency})`);

  // 2. Seed Users
  console.log("\n👤 Seeding Users...");
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash("admin123", salt);

  const usersData = [
    {
      name: "Admin User",
      email: "admin@minibusinesserp.com",
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Demo Manager",
      email: "manager@minibusinesserp.com",
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Sales Executive",
      email: "sales@minibusinesserp.com",
      passwordHash: defaultPasswordHash,
    },
  ];

  for (const user of usersData) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
      },
      create: user,
    });
    console.log(`✓ User: ${upsertedUser.name} <${upsertedUser.email}> (default password: admin123)`);
  }

  // 3. Seed Parties (Vendors, Clients, Both)
  console.log("\n🤝 Seeding Parties...");
  const partiesData = [
    {
      name: "Dhaka Supplies Ltd",
      type: PartyType.VENDOR,
      email: "orders@dhakasupplies.com",
      phone: "+880 1711-000001",
      address: "12 Motijheel C/A, Dhaka",
      openingBalance: 0,
    },
    {
      name: "Bengal Imports & Trading",
      type: PartyType.VENDOR,
      email: "sales@bengalimports.com",
      phone: "+880 1711-000002",
      address: "88 Agrabad Commercial Area, Chittagong",
      openingBalance: 15000.0,
    },
    {
      name: "Apex Retail Mart",
      type: PartyType.CLIENT,
      email: "contact@apexmart.com",
      phone: "+880 1811-000003",
      address: "Plot 15, Road 27, Dhanmondi, Dhaka",
      openingBalance: 5200.0,
    },
    {
      name: "Prime Superstore",
      type: PartyType.CLIENT,
      email: "info@primesuperstore.com",
      phone: "+880 1811-000004",
      address: "Gulshan Avenue, Circle 2, Dhaka",
      openingBalance: 0,
    },
    {
      name: "Metro Distribution Hub",
      type: PartyType.BOTH,
      email: "metro@distributionhub.com",
      phone: "+880 1911-000005",
      address: "Tejgaon Industrial Area, Dhaka",
      openingBalance: 2500.0,
    },
  ];

  for (const party of partiesData) {
    const existing = await prisma.party.findFirst({
      where: { name: party.name },
    });
    const savedParty = existing
      ? await prisma.party.update({
          where: { id: existing.id },
          data: party,
        })
      : await prisma.party.create({
          data: party,
        });
    console.log(`✓ Party: ${savedParty.name} [${savedParty.type}]`);
  }

  // 4. Seed Products
  console.log("\n📦 Seeding Products...");
  const productsData = [
    {
      name: "Wireless Optical Mouse",
      sku: "PRD-MOU-001",
      unit: "pcs",
      purchasePrice: 350.0,
      sellingPrice: 550.0,
      currentStock: 45.0,
      lowStockAt: 10.0,
      isActive: true,
    },
    {
      name: "Mechanical Gaming Keyboard",
      sku: "PRD-KBD-002",
      unit: "pcs",
      purchasePrice: 1800.0,
      sellingPrice: 2600.0,
      currentStock: 18.0,
      lowStockAt: 5.0,
      isActive: true,
    },
    {
      name: "24-Inch IPS Full HD Monitor",
      sku: "PRD-MON-003",
      unit: "pcs",
      purchasePrice: 11500.0,
      sellingPrice: 14500.0,
      currentStock: 8.0,
      lowStockAt: 3.0,
      isActive: true,
    },
    {
      name: "USB-C Braided Fast Charging Cable 2M",
      sku: "PRD-CAB-004",
      unit: "pcs",
      purchasePrice: 120.0,
      sellingPrice: 250.0,
      currentStock: 120.0,
      lowStockAt: 20.0,
      isActive: true,
    },
    {
      name: "Thermal POS Paper Roll 80mm",
      sku: "PRD-THP-005",
      unit: "roll",
      purchasePrice: 45.0,
      sellingPrice: 75.0,
      currentStock: 3.0, // Low stock demo (< lowStockAt 15)
      lowStockAt: 15.0,
      isActive: true,
    },
    {
      name: "A4 Copy Paper 80GSM (500 Sheets)",
      sku: "PRD-PAP-006",
      unit: "rim",
      purchasePrice: 380.0,
      sellingPrice: 480.0,
      currentStock: 35.0,
      lowStockAt: 10.0,
      isActive: true,
    },
  ];

  for (const product of productsData) {
    const upsertedProduct = await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });
    console.log(`✓ Product: ${upsertedProduct.name} (${upsertedProduct.sku}) - Stock: ${upsertedProduct.currentStock} ${upsertedProduct.unit}`);
  }

  console.log("\n🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
