import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';

// ─── getDashboardStats ──────────────────────────────────────────────────────

export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await adminService.getDashboardStats();

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getUsers ───────────────────────────────────────────────────────────────

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await adminService.getUsers(req.query as any);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getUserById ────────────────────────────────────────────────────────────

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await adminService.getUserById(req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateUser ─────────────────────────────────────────────────────────────

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await adminService.updateUser(req.params.id as string, req.body);

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deleteUser ─────────────────────────────────────────────────────────────

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await adminService.deleteUser(req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── getStores ──────────────────────────────────────────────────────────────

export const getStores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await adminService.getStores(req.query as any);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateStore ────────────────────────────────────────────────────────────

export const updateStore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await adminService.updateStore(req.params.id as string, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Store updated successfully.',
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deleteStore ────────────────────────────────────────────────────────────

export const deleteStore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await adminService.deleteStore(req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Store deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── getOrders ──────────────────────────────────────────────────────────────

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await adminService.getOrders(req.query as any);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getCategories ──────────────────────────────────────────────────────────

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await adminService.getCategories();

    res.status(200).json({
      status: 'success',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// ─── createCategory ─────────────────────────────────────────────────────────

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await adminService.createCategory(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Category created successfully.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateCategory ─────────────────────────────────────────────────────────

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await adminService.updateCategory(req.params.id as string, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Category updated successfully.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deleteCategory ─────────────────────────────────────────────────────────

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await adminService.deleteCategory(req.params.id as string);

    res.status(200).json({
      status: 'success',
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
