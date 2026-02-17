import { Request, Response, NextFunction } from 'express';
import * as integrationService from '../services/integration.service';

// ─── getIntegrations ────────────────────────────────────────────────────────

export const getIntegrations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await integrationService.getIntegrations(
      req.params.storeId as string,
      req.user!.id,
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

// ─── getIntegrationById ─────────────────────────────────────────────────────

export const getIntegrationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const integration = await integrationService.getIntegrationById(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      data: integration,
    });
  } catch (error) {
    next(error);
  }
};

// ─── createIntegration ──────────────────────────────────────────────────────

export const createIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const integration = await integrationService.createIntegration(
      req.params.storeId as string,
      req.user!.id,
      req.body
    );

    res.status(201).json({
      status: 'success',
      message: 'Integration created successfully.',
      data: integration,
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateIntegration ──────────────────────────────────────────────────────

export const updateIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const integration = await integrationService.updateIntegration(
      req.params.id as string,
      req.user!.id,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Integration updated successfully.',
      data: integration,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deleteIntegration ──────────────────────────────────────────────────────

export const deleteIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await integrationService.deleteIntegration(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Integration deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── syncIntegration ────────────────────────────────────────────────────────

export const syncIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const integration = await integrationService.syncIntegration(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Integration sync triggered successfully.',
      data: integration,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getIntegrationStats ────────────────────────────────────────────────────

export const getIntegrationStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await integrationService.getIntegrationStats(
      req.params.storeId as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
