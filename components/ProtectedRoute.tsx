import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth(); // Adicionando o estado de `loading`
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Se a autenticação já foi carregada e o usuário não está autenticado, redireciona
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    // Exibe um placeholder enquanto o estado de autenticação está carregando
    return <p>Carregando...</p>;
  }

  // Renderiza o conteúdo protegido apenas quando o usuário está autenticado
  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
