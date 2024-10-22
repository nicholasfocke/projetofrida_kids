import { ReactNode, useEffect, useState } from 'react';
import { FaInstagram, FaBars, FaTimes } from 'react-icons/fa'; 
import { auth, firestore } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import styles from './Layout.module.css';
import Link from 'next/link';
import { useRouter } from 'next/router'; // Importar useRouter para verificar a rota atual

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [menuOpen, setMenuOpen] = useState(false); // Controla se o menu está aberto
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const router = useRouter(); // Hook para pegar a rota atual

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!userName) {
        setUserName('Visitante'); // Define como "Visitante" após 10 segundos se o nome não for recuperado
        setLoading(false);
      }
    }, 10000); // 10 segundos para exibir "Visitante"

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Pega o nome do usuário imediatamente após o login
        const userDoc = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
          const fullName = docSnap.data().nome || 'Usuário';
          const firstName = fullName.split(' ')[0];
          setUserName(firstName); // Atualiza o nome do usuário
          clearTimeout(timeoutId); // Cancela o timeout de 10 segundos
        }
      }
      setLoading(false); // Desativa o carregamento quando o nome for recuperado
    });

    // Definir saudação com base no horário atual
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) {
      setGreeting('Bom dia');
    } else if (hours >= 12 && hours < 18) {
      setGreeting('Boa tarde');
    } else {
      setGreeting('Boa noite');
    }

    return () => {
      unsubscribe();
      clearTimeout(timeoutId); // Limpa o timeout quando o componente desmontar
    };
  }, [userName]);

  // Função para alternar a abertura e fechamento do menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };


  const noHeaderRoutes = ['/login', '/register', '/esquecisenha'];

  if (loading) {
    return <div>Carregando...</div>; // Exibe "Carregando..." enquanto espera o nome ou timeout
  }

  return (
    <div className={styles.layout}>
      {/* Verificar se a rota atual está em noHeaderRoutes e, se não estiver, exibir o header */}
      {!noHeaderRoutes.includes(router.pathname) && (
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <Image
              src="/images/logo.png" 
              alt="Logo Frida Kids"
              width={150}
              height={150}
            />
            {/* Mostrar saudação somente quando o nome do usuário estiver carregado */}
            <p className={styles.greetingsTitle}>
              {`Olá, ${greeting} ${userName}!`}
            </p>

            {/* Ícone de menu para versões mobile */}
            <div className={styles.menuIcon} onClick={toggleMenu}>
              {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </div>

            {/* Navegação (ocultada em telas pequenas) */}
            <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
              {/* Links do menu */}
              <Link className={styles.headerLinks} href="/">Agendamento</Link>
              <Link className={styles.headerLinks} href="/Agendamentos">Meus Agendamentos</Link>
              <Link className={styles.headerLinks} href="/profile">Meu Perfil</Link>

              {/* Ícone de X para fechar o menu */}
              <div className={styles.closeMenuIcon} onClick={toggleMenu}>
                <FaTimes size={24} />
              </div>
            </nav>
          </div>
        </header>
      )}

      <main className="mainContent">{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.contactInfo}>
            <p>Alguma dúvida?</p>
            <button className={styles.contactButton}>
              <a href="https://api.whatsapp.com/send/?phone=5582996900232&text=Gostaria+de+fazer+um+agendamento+&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer">
                Entre em contato
              </a>
            </button>
            <p>Horários de funcionamento: Ter-Sab: 9h às 19h</p>
            <div className={styles.socialMedia}>
              <a href="https://www.instagram.com/frida.kids_?igsh=MXY4dHN5aHpkZjRuOA==" target="_blank" rel="noopener noreferrer">
                <FaInstagram size={24} color="white" />
              </a>
            </div>
          </div>
        </div>
        <p>© 2024 FridaKids - Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Layout;
