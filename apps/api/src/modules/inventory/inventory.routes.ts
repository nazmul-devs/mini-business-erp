import { Router } from "express";
import { prisma } from "@erp/database";
import { authenticate } from "../../middlewares";

const router = Router();

router.use(authenticate);

router.get("/movements", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true },
        },
      },
    }),
    prisma.stockMovement.count(),
  ]);

  res.status(200).json({
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

router.get("/low-stock", async (_req, res) => {
  const items = await prisma.$queryRaw`
    SELECT id, name, sku, unit, "currentStock", "lowStockAt", "purchasePrice", "sellingPrice"
    FROM "Product"
    WHERE "currentStock" <= "lowStockAt" AND "isActive" = true
    ORDER BY "currentStock" ASC
  `;

  res.status(200).json({
    success: true,
    data: items,
  });
});

export const inventoryRouter = router;
