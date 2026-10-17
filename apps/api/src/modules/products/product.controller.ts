import { Request, Response } from "express";
import { ProductQueryInput } from "@erp/shared";
import { ProductService, productService } from "./product.service";

export class ProductController {
  constructor(private readonly service: ProductService = productService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ProductQueryInput;
    const result = await this.service.getProducts(query);
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
    const product = await this.service.getProductById(id);
    res.status(200).json({
      success: true,
      data: product,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const product = await this.service.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await this.service.updateProduct(id, req.body);
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.deleteProduct(id);
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  };

  getMovements = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const query = req.query as { page?: string; limit?: string };
    const result = await this.service.getProductMovements(id, {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });

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

  adjustStock = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await this.service.adjustStock(id, req.body);
    res.status(200).json({
      success: true,
      message: "Stock adjusted successfully",
      data: result,
    });
  };
}

export const productController = new ProductController();
