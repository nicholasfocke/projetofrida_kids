import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import bcrypt from 'bcryptjs';
import InputMask from 'react-input-mask';  // Importando a biblioteca de máscaras
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

  const checkDuplicateUser = async (email: string, telefone: string, cpf: string) => {
    const usersRef = collection(firestore, 'users');

    // Verificar duplicidade de telefone
    const phoneQuery = query(usersRef, where('telefone', '==', telefone));
    const phoneExists = await getDocs(phoneQuery);
    if (!phoneExists.empty) {
      throw new Error('Esse número de telefone já está cadastrado.');
    }

    // Verificar duplicidade de CPF
    const cpfQuery = query(usersRef, where('cpf', '==', cpf));
    const cpfExists = await getDocs(cpfQuery);
    if (!cpfExists.empty) {
      throw new Error('Esse CPF já está cadastrado.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      // Verificar duplicidade de telefone e CPF no Firestore
      await checkDuplicateUser(formData.email, formData.telefone, formData.cpf);

      // Criar o usuário no Firebase Authentication
      await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
      const hashedPassword = await bcrypt.hash(formData.senha, 10);

      // Adicionar o usuário na coleção 'users' do Firestore
      await addDoc(collection(firestore, 'users'), {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf,
        senha: hashedPassword,
        tipo: 'cliente',
      });

      // Redireciona o usuário para a página index após o cadastro
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
          {/* Campo de Telefone com máscara */}
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
          {/* Campo de CPF com máscara */}
          <InputMask
            mask="999.999.999-99"
            value={formData.cpf}
            onChange={handleChange}
          >
            {(inputProps: any) => (
              <input
                {...inputProps}
                name="cpf"
                type="text"
                placeholder="CPF"
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
