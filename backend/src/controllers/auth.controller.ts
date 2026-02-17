import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

// ─── register ───────────────────────────────────────────────────────────────

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── login ──────────────────────────────────────────────────────────────────

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── refreshToken ───────────────────────────────────────────────────────────

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshToken(token);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── logout ─────────────────────────────────────────────────────────────────

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    await authService.logout(token);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── changePassword ─────────────────────────────────────────────────────────

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
