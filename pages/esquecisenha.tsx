import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig'; 
import styles from './esquecisenha.module.css'; 
import { useRouter } from 'next/router';

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      // Envia o email de redefinição de senha
      await sendPasswordResetEmail(auth, email);
      setMessage('Um email de redefinição de senha foi enviado.');
    } catch (err: any) {
      // Tratamento de erros
      if (err.code === 'auth/invalid-email') {
        setError('Endereço de email inválido.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuário não encontrado.');
      } else {
        setError('Ocorreu um erro. Tente novamente mais tarde.');
      }
    }
  };

  // Função para redirecionar para a página de login
  const handleLoginRedirect = () => {
    router.push('/login'); // Substitua '/login' pelo caminho correto da sua página de login
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Recuperar senha</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={handleChange}
            required
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.message}>{message}</p>}
          <button type="submit" className={styles.button}>Enviar</button>
        </form>

        {/* Botão para redirecionar ao login */}
        <button onClick={handleLoginRedirect} className={styles.buttonSecondary}>
          Voltar ao Login
        </button>
      </div>
    </div>
  );
};

export default EsqueciSenha;
