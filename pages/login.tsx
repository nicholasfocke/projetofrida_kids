import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
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
  const [showPassword, setShowPassword] = useState(false); // Controle de exibição da senha
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword); // Alterna a visualização da senha
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
          blockedUntil: new Date(Date.now() + 30 * 60000),
        });
        throw new Error('Você errou o login 5 vezes. Sua conta foi bloqueada por 30 minutos.');
      } else {
        await updateDoc(docRef, { count: data.count + 1 });
      }
    }
  };

  const resetLoginAttempts = async (email: string) => {
    const docRef = doc(firestore, 'loginAttempts', email);
    await setDoc(docRef, { count: 0, blockedUntil: null }, { merge: true });
  };

  // Função de envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await checkBlockStatus(formData.email);
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.senha);
      const user = userCredential.user;

      await setDoc(
        doc(firestore, 'users', user.uid),
        { email: user.email },
        { merge: true }
      );

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
          <div className={styles.passwordContainer}>
            <input 
              name="senha" 
              type={showPassword ? "text" : "password"} 
              placeholder="Senha" 
              value={formData.senha} 
              onChange={handleChange} 
              required 
              className={styles.input}
            />
            <span onClick={toggleShowPassword} className={styles.eyeIcon}>
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path d="M12 4.5C7.5 4.5 3.7 7.7 2 12c1.7 4.3 5.5 7.5 10 7.5s8.3-3.2 10-7.5c-1.7-4.3-5.5-7.5-10-7.5zm0 12.5c-2.8 0-5.2-1.9-5.8-4.5.6-2.6 3-4.5 5.8-4.5 2.8 0 5.2 1.9 5.8 4.5-.6 2.6-3 4.5-5.8 4.5zM12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path d="M12 5c-7.7 0-12 7-12 7s4.3 7 12 7 12-7 12-7-4.3-7-12-7zm0 12c-4.2 0-7.2-3.5-7.8-5 .6-1.5 3.6-5 7.8-5 4.2 0 7.2 3.5 7.8 5-.6 1.5-3.6 5-7.8 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z" />
                </svg>
              )}
            </span>
          </div>
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
