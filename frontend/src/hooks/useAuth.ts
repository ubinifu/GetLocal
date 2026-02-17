import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { loginUser, registerUser, logoutUser } from '@/store/authSlice';
import type { RegisterData } from '@/services/auth.service';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await dispatch(loginUser({ email, password }));
      if (loginUser.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
      return result.payload;
    },
    [dispatch]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const result = await dispatch(registerUser(data));
      if (registerUser.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
      return result.payload;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}

export default useAuth;
