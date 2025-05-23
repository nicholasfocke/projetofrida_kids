import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import bcrypt from 'bcryptjs';
import styles from './register.module.css';
import Image from 'next/image';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const formatTelefone = (value: string) => {
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');

    // Aplica a máscara XX XXXXX-XXXX ou XX XXXX-XXXX
    if (numericValue.length <= 10) {
      return numericValue.replace(/(\d{2})(\d{4})(\d{0,4})/, '$1 $2$3');
    }
    return numericValue.replace(/(\d{2})(\d{5})(\d{0,4})/, '$1 $2$3');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: name === 'telefone' ? formatTelefone(value) : value, // Formata o telefone
    });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const telefoneRegex = /^\d{2} \d{4,5}\d{4}$/;
    if (!telefoneRegex.test(formData.telefone)) {
      setError('Preencha completamente o campo de telefone com pelo menos 8 números, exemplo: "82 999999999" ou "82 99999999".');
      return;
    }

    if (formData.senha.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    const blockedDomains = ['msn.com', 'aol.com', 'example.com',  'mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com',
      'trashmail.com', 'yopmail.com', 'getnada.com', 'maildrop.cc',
      'dispostable.com', 'emailondeck.com', 'fakeinbox.com', 'mintemail.com',
      'mytemp.email', 'throwawaymail.com', 'spambog.com', 'mailcatch.com',
      'sharklasers.com', 'inboxbear.com', 'nowmymail.com', 'yahoo.com', 'yahoo.com.br','ig.com.br', 'bol.com.br', 'zipmail.com.br'];

    const emailDomain = formData.email.split('@')[1];
    if (blockedDomains.includes(emailDomain)) {
      setError('O domínio do e-mail fornecido não é permitido. Por favor, use outro e-mail válido, exemplo "@gmail, @hotmail etc.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
      const user = userCredential.user;

      const hashedPassword = await bcrypt.hash(formData.senha, 10);

      await setDoc(doc(firestore, 'users', user.uid), {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf,
        senha: hashedPassword,
        tipo: 'cliente',
      });

      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Esse email já está cadastrado.');
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
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Image src="/images/logo.png" alt="Logo Frida Kids" width={150} height={150} />
        </div>

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
          <input
            name="telefone"
            type="text"
            placeholder="Telefone"
            value={formData.telefone}
            onChange={handleChange}
            required
            className={styles.input}
          />

          {/* Campo de senha com ícone de olho */}
          <div className={styles.passwordContainer}>
            <input
              name="senha"
              type={showPassword ? 'text' : 'password'}
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

          {/* Campo de confirmar senha com ícone de olho */}
          <div className={styles.passwordContainer}>
            <input
              name="confirmarSenha"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirmar Senha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <span onClick={toggleShowConfirmPassword} className={styles.eyeIcon}>
              {showConfirmPassword ? (
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
          <button type="submit" className={styles.button}>Cadastrar</button>
        </form>
        <p className={styles.redirectText}>Já possui uma conta?</p>
        <button onClick={handleRedirectToLogin} className={styles.redirectButton}>Fazer Login</button>
      </div>
    </div>
  );
};

export default Register;