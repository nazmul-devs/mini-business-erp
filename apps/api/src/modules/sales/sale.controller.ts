import { Request, Response } from "express";
import { SaleQueryInput } from "@erp/shared";
import { SaleService, saleService } from "./sale.service";

export class SaleController {
  constructor(private readonly service: SaleService = saleService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as SaleQueryInput;
    const result = await this.service.getSales(query);
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
    const sale = await this.service.getSaleById(id);
    res.status(200).json({
      success: true,
      data: sale,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const sale = await this.service.createSale(req.body);
    res.status(201).json({
      success: true,
      message: "Sale invoice created successfully",
      data: sale,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const sale = await this.service.updateSale(id, req.body);
    res.status(200).json({
      success: true,
      message: "Sale invoice updated successfully",
      data: sale,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.deleteSale(id);
    res.status(200).json({
      success: true,
      message: "Sale invoice deleted successfully",
    });
  };
}

export const saleController = new SaleController();
