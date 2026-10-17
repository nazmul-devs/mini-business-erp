import { describe, it, expect, vi, beforeEach } from "vitest";
import { PartyService } from "./party.service";
import { PartyRepository } from "./party.repository";
import { AppError } from "../../shared/errors";
import { PartyType } from "@erp/database";

describe("PartyService", () => {
  let partyService: PartyService;
  let mockRepo: PartyRepository;

  const mockParty = {
    id: "party-1",
    name: "Dhaka Supplies",
    type: PartyType.VENDOR,
    email: "vendor@example.com",
    phone: "01700000000",
    address: "Dhaka",
    openingBalance: { toNumber: () => 0 } as unknown as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hasTransactions: vi.fn(),
    } as unknown as PartyRepository;

    partyService = new PartyService(mockRepo);
  });

  describe("getParties", () => {
    it("should return paginated list of parties with totalPages", async () => {
      vi.mocked(mockRepo.findMany).mockResolvedValue({
        items: [mockParty as any],
        total: 1,
      });

      const result = await partyService.getParties({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe("getPartyById", () => {
    it("should return party if found", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockParty as any);

      const result = await partyService.getPartyById("party-1");
      expect(result.id).toBe("party-1");
    });

    it("should throw not found error if party does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(partyService.getPartyById("unknown")).rejects.toThrow(
        AppError.notFound("Party not found")
      );
    });
  });

  describe("createParty", () => {
    it("should throw conflict error if party name already exists", async () => {
      vi.mocked(mockRepo.findByName).mockResolvedValue(mockParty as any);

      await expect(
        partyService.createParty({
          name: "Dhaka Supplies",
          type: PartyType.VENDOR,
          openingBalance: 0,
        })
      ).rejects.toThrow(AppError.conflict("A party with this name already exists"));
    });

    it("should create party if name is unique", async () => {
      vi.mocked(mockRepo.findByName).mockResolvedValue(null);
      vi.mocked(mockRepo.create).mockResolvedValue(mockParty as any);

      const result = await partyService.createParty({
        name: "Dhaka Supplies",
        type: PartyType.VENDOR,
        openingBalance: 0,
      });

      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.id).toBe("party-1");
    });
  });

  describe("updateParty", () => {
    it("should throw not found error if party does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(
        partyService.updateParty("unknown", { name: "New Name" })
      ).rejects.toThrow(AppError.notFound("Party not found"));
    });

    it("should throw conflict if updating name to an already existing party name", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockParty as any);
      vi.mocked(mockRepo.findByName).mockResolvedValue({
        ...mockParty,
        id: "party-2",
        name: "Existing Other",
      } as any);

      await expect(
        partyService.updateParty("party-1", { name: "Existing Other" })
      ).rejects.toThrow(AppError.conflict("Another party with this name already exists"));
    });

    it("should update party successfully", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockParty as any);
      vi.mocked(mockRepo.findByName).mockResolvedValue(null);
      vi.mocked(mockRepo.update).mockResolvedValue({
        ...mockParty,
        name: "Updated Name",
      } as any);

      const result = await partyService.updateParty("party-1", { name: "Updated Name" });
      expect(result.name).toBe("Updated Name");
    });
  });

  describe("deleteParty", () => {
    it("should throw not found error if party does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(partyService.deleteParty("unknown")).rejects.toThrow(
        AppError.notFound("Party not found")
      );
    });

    it("should throw bad request if party has purchase or sales transactions", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockParty as any);
      vi.mocked(mockRepo.hasTransactions).mockResolvedValue(true);

      await expect(partyService.deleteParty("party-1")).rejects.toThrow(
        AppError.badRequest("Cannot delete party with existing purchase or sales transactions")
      );
    });

    it("should delete party when no transactions exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockParty as any);
      vi.mocked(mockRepo.hasTransactions).mockResolvedValue(false);
      vi.mocked(mockRepo.delete).mockResolvedValue(mockParty as any);

      await expect(partyService.deleteParty("party-1")).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith("party-1");
    });
  });
});
