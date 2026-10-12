import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/auth-context';

/** Current admin user plus login / logout / changePassword. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
