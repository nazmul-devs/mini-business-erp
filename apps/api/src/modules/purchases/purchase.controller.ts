import { Request, Response } from "express";
import { PurchaseQueryInput } from "@erp/shared";
import { PurchaseService, purchaseService } from "./purchase.service";

export class PurchaseController {
  constructor(private readonly service: PurchaseService = purchaseService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as PurchaseQueryInput;
    const result = await this.service.getPurchases(query);
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
    const purchase = await this.service.getPurchaseById(id);
    res.status(200).json({
      success: true,
      data: purchase,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const purchase = await this.service.createPurchase(req.body);
    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: purchase,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await this.service.updatePurchase(id, req.body);
    res.status(200).json({
      success: true,
      message: "Purchase order updated successfully",
      data: purchase,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.deletePurchase(id);
    res.status(200).json({
      success: true,
      message: "Purchase order deleted successfully",
    });
  };
}

export const purchaseController = new PurchaseController();
