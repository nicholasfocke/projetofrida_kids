import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, firestore } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './profile.module.css';

const Profile = () => {
  const [userData, setUserData] = useState({
    nome: '',
    email: '',
    telefone: '',
  });
  const [originalData, setOriginalData] = useState({
    nome: '',
    email: '',
    telefone: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChanged, setIsChanged] = useState(false); // Estado para verificar se algo mudou
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está logado
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Obter dados do usuário do Firestore
        const userDoc = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const initialData = {
            nome: data.nome || '',
            email: data.email || '',
            telefone: data.telefone || '',
          };
          setUserData(initialData);
          setOriginalData(initialData); // Salva os dados originais para comparação
        }
        setIsLoading(false);
      } else {
        // Redirecionar para a página de login se não estiver logado
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Verificar se algum campo foi alterado
  useEffect(() => {
    const hasChanges = 
      userData.nome !== originalData.nome ||
      userData.email !== originalData.email ||
      userData.telefone !== originalData.telefone;
    setIsChanged(hasChanges); // Habilitar/desabilitar o botão com base em mudanças
  }, [userData, originalData]);

  // Função para verificar se o email ou telefone já está cadastrado
  const checkIfEmailOrPhoneExists = async () => {
    try {
      const q = query(
        collection(firestore, 'users'),
        where('email', '==', userData.email),
        where('telefone', '==', userData.telefone)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar email ou telefone existentes: ', error);
      return false;
    }
  };

  // Função para atualizar dados no Firebase
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (user) {
        // Verificar se email ou telefone já estão cadastrados
        const emailOrPhoneExists = await checkIfEmailOrPhoneExists();
        if (emailOrPhoneExists) {
          setError('Email ou telefone já cadastrados por outro usuário.');
          setIsUpdating(false);
          return;
        }

        // Atualizar os dados no Firestore
        const userDoc = doc(firestore, 'users', user.uid);
        await updateDoc(userDoc, {
          nome: userData.nome,
          email: userData.email,
          telefone: userData.telefone,
        });
        alert('Dados atualizados com sucesso!');
        setOriginalData(userData); // Atualizar os dados originais com os novos
        setIsChanged(false); // Desabilitar o botão novamente
      }
    } catch (error) {
      console.error('Erro ao atualizar dados: ', error);
      setError('Erro ao atualizar os dados. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <p>Carregando dados...</p>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Meu Perfil</h1>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleUpdate} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="nome">Nome</label>
          <input
            type="text"
            id="nome"
            value={userData.nome}
            onChange={(e) => setUserData({ ...userData, nome: e.target.value })}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="telefone">Telefone</label>
          <input
            type="text"
            id="telefone"
            value={userData.telefone}
            onChange={(e) => setUserData({ ...userData, telefone: e.target.value })}
            required
          />
        </div>
        <button type="submit" className={styles.submitButton} disabled={!isChanged || isUpdating}>
          {isUpdating ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
