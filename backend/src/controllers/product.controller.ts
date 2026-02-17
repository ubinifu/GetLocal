import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service';

// ─── createProduct ──────────────────────────────────────────────────────────

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await productService.createProduct(
      req.params.storeId as string,
      req.user!.id,
      req.body
    );

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getProductsByStore ─────────────────────────────────────────────────────

export const getProductsByStore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await productService.getProductsByStore(
      req.params.storeId as string,
      req.query as any
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getProductById ─────────────────────────────────────────────────────────

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await productService.getProductById(req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateProduct ──────────────────────────────────────────────────────────

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await productService.updateProduct(
      req.params.id as string,
      req.user!.id,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deleteProduct ──────────────────────────────────────────────────────────

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await productService.deleteProduct(req.params.id as string, req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateStock ────────────────────────────────────────────────────────────

export const updateStock = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quantity } = req.body;
    const product = await productService.updateStock(
      req.params.id as string,
      req.user!.id,
      quantity
    );

    res.status(200).json({
      status: 'success',
      message: 'Stock updated successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};
