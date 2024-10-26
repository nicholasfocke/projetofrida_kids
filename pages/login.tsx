import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image'; // Importando o componente Image do Next.js
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import styles from './login.module.css';

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

  // Verifica se o usuário está bloqueado
  const checkBlockStatus = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const now = new Date().getTime();
      if (data.blockedUntil && data.blockedUntil.seconds * 1000 > now) {
        const minutesLeft = Math.ceil((data.blockedUntil.seconds * 1000 - now) / 60000);
        throw new Error(`Número de tentativas excedido. Tente novamente em ${minutesLeft} minutos.`);
      }
    }
  };

  // Incrementa as tentativas de login
  const incrementLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    const docSnap = await getDoc(docRef);
  
    if (!docSnap.exists()) {
      await setDoc(docRef, { count: 1, blockedUntil: null });
    } else {
      const data = docSnap.data();
      if (data.count >= 4) {
        await updateDoc(docRef, {
          count: 5,
          blockedUntil: new Date(Date.now() + 30 * 60000), // Bloqueia por 30 minutos
        });
        throw new Error('Você errou o login 5 vezes. Sua conta foi bloqueada por 30 minutos.');
      } else {
        await updateDoc(docRef, { count: data.count + 1 });
      }
    }
  };

  // Reseta as tentativas após login bem-sucedido
  const resetLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    await setDoc(docRef, { count: 0, blockedUntil: null }, { merge: true });
  };

  // Função de envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Limpa os erros anteriores

    try {
      await checkBlockStatus(formData.email);
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.senha);
      const user = userCredential.user;

      // Atualiza ou cria o documento com o UID no Firestore
      await setDoc(doc(firestore, 'users', user.uid), {
        email: user.email,
        // Adicionar outros campos que possam ser atualizados no login
      }, { merge: true });

      await resetLoginAttempts(formData.email);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        try {
          await incrementLoginAttempts(formData.email);
          setError('Senha ou email incorreto.');
        } catch (blockError: any) {
          setError(blockError.message);
        }
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de email inválido.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas falhadas. Tente novamente mais tarde ou redefina sua senha.');
      } else {
        setError('Erro de login. Tente novamente.');
      }
    }
  };

  const handleRegisterRedirect = () => {
    router.push('/register');
  };

  const handleForgotPasswordRedirect = () => {
    router.push('/esquecisenha'); 
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        {/* Adicione a logo aqui */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Image
            src="/images/logo.png" 
            alt="Logo Frida Kids"
            width={150}
            height={150}
          />
        </div>
        
        <h1 className={styles.title}>Login</h1>
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
        <button onClick={handleForgotPasswordRedirect} className={styles.buttonForgotPass}>
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
};

export default Login;
