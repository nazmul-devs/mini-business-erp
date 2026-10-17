import { prisma, Party, Prisma } from "@erp/database";
import { CreatePartyInput, PartyQueryInput, UpdatePartyInput } from "@erp/shared";

export class PartyRepository {
  async findMany(query: PartyQueryInput): Promise<{ items: Party[]; total: number }> {
    const { search, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PartyWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.party.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.party.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.party.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true,
            sales: true,
          },
        },
      },
    });
  }

  async findByName(name: string): Promise<Party | null> {
    return prisma.party.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });
  }

  async create(data: CreatePartyInput): Promise<Party> {
    return prisma.party.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        openingBalance: data.openingBalance ?? 0,
      },
    });
  }

  async update(id: string, data: UpdatePartyInput): Promise<Party> {
    return prisma.party.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.openingBalance !== undefined && { openingBalance: data.openingBalance }),
      },
    });
  }

  async delete(id: string): Promise<Party> {
    return prisma.party.delete({
      where: { id },
    });
  }

  async hasTransactions(id: string): Promise<boolean> {
    const counts = await prisma.party.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            purchases: true,
            sales: true,
          },
        },
      },
    });

    if (!counts) return false;
    return counts._count.purchases > 0 || counts._count.sales > 0;
  }
}

export const partyRepository = new PartyRepository();
