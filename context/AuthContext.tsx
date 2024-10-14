import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../firebase/firebaseConfig'; // Certifique-se de que o arquivo firebase está configurado corretamente
import { User } from 'firebase/auth';

interface AuthContextProps {
  user: User | null;
}

const AuthContext = createContext<AuthContextProps>({ user: null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
