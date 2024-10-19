import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Use doc e setDoc para criar o documento com o UID
import { auth, firestore } from '../firebase/firebaseConfig';
import bcrypt from 'bcryptjs';
import InputMask from 'react-input-mask';
import styles from './register.module.css';

const Register = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      // Criar o usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
      const user = userCredential.user;

      const hashedPassword = await bcrypt.hash(formData.senha, 10);

      // Criar o documento com o UID do usuário no Firestore
      await setDoc(doc(firestore, 'users', user.uid), {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf,
        senha: hashedPassword,
        tipo: 'cliente', // Define o tipo do usuário
      });

      // Redireciona o usuário para a página inicial
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Esse email já está cadastrado.');
      } else if (err.message === 'Esse número de telefone já está cadastrado.') {
        setError(err.message);
      } else if (err.message === 'Esse CPF já está cadastrado.') {
        setError(err.message);
      } else {
        setError('Erro ao cadastrar. Tente novamente.');
      }
    }
  };

  const handleRedirectToLogin = () => {
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Cadastro</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input 
            name="nome" 
            type="text" 
            placeholder="Nome" 
            value={formData.nome} 
            onChange={handleChange} 
            required 
            className={styles.input}
          />
          <input 
            name="email" 
            type="email" 
            placeholder="Email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            className={styles.input}
          />
          <InputMask
            mask="(99) 99999-9999"
            value={formData.telefone}
            onChange={handleChange}
          >
            {(inputProps: any) => (
              <input
                {...inputProps}
                name="telefone"
                type="text"
                placeholder="Telefone"
                required
                className={styles.input}
              />
            )}
          </InputMask>
          <input 
            name="senha" 
            type="password" 
            placeholder="Senha" 
            value={formData.senha} 
            onChange={handleChange} 
            required 
            className={styles.input}
          />
          <input 
            name="confirmarSenha" 
            type="password" 
            placeholder="Confirmar Senha" 
            value={formData.confirmarSenha} 
            onChange={handleChange} 
            required 
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>Cadastrar</button>
        </form>
        <p className={styles.redirectText}>Já possui uma conta?</p>
        <button onClick={handleRedirectToLogin} className={styles.redirectButton}>Ir para Login</button>
      </div>
    </div>
  );
};

export default Register;
