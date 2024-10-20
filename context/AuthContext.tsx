import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../firebase/firebaseConfig'; 
import { User } from 'firebase/auth';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Estado de carregamento

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Quando a autenticação termina, setamos `loading` como `false`
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
