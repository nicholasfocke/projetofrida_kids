import { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // Firestore functions
import { auth, firestore } from '../firebase/firebaseConfig'; // Firebase config
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

  // Função para verificar se o usuário está bloqueado e retornar os minutos restantes
  const checkBlockStatus = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const now = new Date().getTime();
      if (data.blockedUntil && data.blockedUntil.seconds * 1000 > now) {
        const minutesLeft = Math.ceil((data.blockedUntil.seconds * 1000 - now) / 60000);
        throw new Error(`Sua conta está bloqueada. Tente novamente em ${minutesLeft} minutos.`);
      }
    }
  };

  const incrementLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);
  
    if (!docSnap.exists()) {
      // Se o documento não existe, crie-o com 1 tentativa
      console.log('Criando novo documento para o usuário:', email); // Adicionar log em português
      await setDoc(docRef, { count: 1, blockedUntil: null });
    } else {
      const data = docSnap.data();
      if (data.count >= 4) {
        // Se o usuário atingiu 5 tentativas, bloqueie-o por 30 minutos
        console.log('Usuário atingiu 5 tentativas, bloqueando conta:', email); // Log para bloqueio do usuário
        await updateDoc(docRef, {
          count: 5,
          blockedUntil: new Date(Date.now() + 30 * 60000), // Bloqueia por 30 minutos
        });
      } else {
        // Incrementa o contador de tentativas
        console.log('Incrementando tentativas de login para o usuário:', email); // Log para incremento de tentativas
        await updateDoc(docRef, { count: data.count + 1 });
      }
    }
  };
  

  // Função para resetar o contador de tentativas após login bem-sucedido
  const resetLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    await setDoc(docRef, { count: 0, blockedUntil: null }, { merge: true });
  };

  // Função de envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Limpa os erros anteriores

    try {
      // Verifica se o usuário está bloqueado
      await checkBlockStatus(formData.email);

      // Tenta realizar o login
      await signInWithEmailAndPassword(auth, formData.email, formData.senha);

      // Resetar as tentativas de login após sucesso
      await resetLoginAttempts(formData.email);

      // Redirecionar para a página inicial
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        try {
          await incrementLoginAttempts(formData.email);
          setError('Email ou senha incorretos.');
        } catch (blockError: any) {
          setError(blockError.message);
        }
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError(err.message || 'Erro de login. Tente novamente.');
      }
    }
  };

  // Função para redirecionar para a página de registro
  const handleRegisterRedirect = () => {
    router.push('/register');
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

        <button onClick={handleRegisterRedirect} className={styles.buttonSecondary}>
          Criar uma nova conta
        </button>
      </div>
    </div>
  );
};

export default Login;