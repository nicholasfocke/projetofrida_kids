import { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Firestore functions
import { auth, firestore } from '../firebase/firebaseConfig'; // Firebase config
import { Timestamp } from 'firebase/firestore';
import styles from './Login.module.css'; // Importando o CSS module

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Função para verificar se o usuário está bloqueado
  const checkBlockStatus = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.blockedUntil && data.blockedUntil.toDate() > new Date()) {
        const minutesLeft = Math.ceil((data.blockedUntil.toDate().getTime() - new Date().getTime()) / 60000);
        throw new Error(`Sua conta está bloqueada. Tente novamente em ${minutesLeft} minutos.`);
      }
    }
  };

  // Função para incrementar o contador de tentativas erradas
  const incrementLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Se não existe, crie um documento com 1 tentativa
      await setDoc(docRef, { count: 1, blockedUntil: null });
    } else {
      const data = docSnap.data();
      if (data.count >= 5) {
        // Bloquear por 30 minutos
        await setDoc(docRef, {
          blockedUntil: Timestamp.fromDate(new Date(Date.now() + 30 * 60000)),
          count: 5 // Não precisa mais incrementar, já está bloqueado
        });
        throw new Error('Você errou o login 5 vezes. Sua conta foi bloqueada por 30 minutos.');
      } else {
        // Incrementar o contador
        await setDoc(docRef, { count: data.count + 1 }, { merge: true });
      }
    }
  };

  // Função para resetar o contador de tentativas após login bem-sucedido
  const resetLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    await setDoc(docRef, { count: 0, blockedUntil: null }, { merge: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Limpa os erros anteriores ao tentar novamente
    try {
      // Verifica se o usuário está bloqueado
      await checkBlockStatus(formData.email);

      // Tenta fazer o login
      await signInWithEmailAndPassword(auth, formData.email, formData.senha);

      // Resetar as tentativas de login após sucesso
      await resetLoginAttempts(formData.email);

      // Redirecionar para a página inicial
      router.push('/');
    } catch (err: any) {
      // Se o erro for de senha incorreta ou usuário não encontrado, incremente o contador
      if (err.code === 'auth/wrong-password') {
        try {
          await incrementLoginAttempts(formData.email);
          setError('Email ou senha incorretos.');
        } catch (blockError: any) {
          setError(blockError.message);
        }
      } else if (err.code === 'auth/user-not-found') {
        setError('Essa conta não existe.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        // Para qualquer outro erro (ex. bloqueio)
        setError('Erro de login. Tente novamente.');
      }
    }
  };

  // Função para redirecionar para a página de registro
  const handleRegisterRedirect = () => {
    router.push('/register'); // Substitua '/register' pelo caminho correto da sua página de registro
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Login</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input 
            name="email" 
            type="email" 
            placeholder="Email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            className={styles.input}
          />
          <input 
            name="senha" 
            type="password" 
            placeholder="Senha" 
            value={formData.senha} 
            onChange={handleChange} 
            required 
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>Entrar</button>
        </form>

        {/* Botão de redirecionamento para o registro */}
        <button onClick={handleRegisterRedirect} className={styles.buttonSecondary}>
          Criar uma nova conta
        </button>
      </div>
    </div>
  );
};

export default Login;