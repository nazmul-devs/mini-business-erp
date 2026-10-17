import { Request, Response } from "express";
import { PartyQueryInput } from "@erp/shared";
import { PartyService, partyService } from "./party.service";

export class PartyController {
  constructor(private readonly service: PartyService = partyService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as PartyQueryInput;
    const result = await this.service.getParties(query);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const party = await this.service.getPartyById(id);
    res.status(200).json({
      success: true,
      data: party,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const party = await this.service.createParty(req.body);
    res.status(201).json({
      success: true,
      message: "Party created successfully",
      data: party,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const party = await this.service.updateParty(id, req.body);
    res.status(200).json({
      success: true,
      message: "Party updated successfully",
      data: party,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.deleteParty(id);
    res.status(200).json({
      success: true,
      message: "Party deleted successfully",
    });
  };
}

export const partyController = new PartyController();
