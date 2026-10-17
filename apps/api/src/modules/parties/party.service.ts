import { CreatePartyInput, PaginatedResult, PartyQueryInput, UpdatePartyInput } from "@erp/shared";
import { Party } from "@erp/database";
import { AppError } from "../../shared/errors";
import { PartyRepository, partyRepository } from "./party.repository";

export class PartyService {
  constructor(private readonly repo: PartyRepository = partyRepository) {}

  async getParties(query: PartyQueryInput): Promise<PaginatedResult<Party>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { items, total } = await this.repo.findMany({ ...query, page, limit });
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getPartyById(id: string) {
    const party = await this.repo.findById(id);
    if (!party) {
      throw AppError.notFound("Party not found");
    }
    return party;
  }

  async createParty(data: CreatePartyInput): Promise<Party> {
    const existing = await this.repo.findByName(data.name);
    if (existing) {
      throw AppError.conflict("A party with this name already exists");
    }

    return this.repo.create(data);
  }

  async updateParty(id: string, data: UpdatePartyInput): Promise<Party> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Party not found");
    }

    if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameConflict = await this.repo.findByName(data.name);
      if (nameConflict && nameConflict.id !== id) {
        throw AppError.conflict("Another party with this name already exists");
      }
    }

    return this.repo.update(id, data);
  }

  async deleteParty(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Party not found");
    }

    const inUse = await this.repo.hasTransactions(id);
    if (inUse) {
      throw AppError.badRequest("Cannot delete party with existing purchase or sales transactions");
    }

    await this.repo.delete(id);
  }
}

export const partyService = new PartyService();
