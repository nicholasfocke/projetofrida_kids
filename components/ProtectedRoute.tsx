import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // Seu contexto de autenticação

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  return user ? children : null;
};

export default ProtectedRoute;
