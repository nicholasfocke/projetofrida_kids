import { ReactNode, useState, useEffect, useRef } from 'react';
import { FaInstagram, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { auth, firestore } from '../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import styles from './Layout.module.css';
import Link from 'next/link';
import { useRouter } from 'next/router';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [menuOpen, setMenuOpen] = useState(false); // Controla se o menu está aberto
  const [isAdmin, setIsAdmin] = useState(false); // Estado para verificar se o usuário é administrador
  const router = useRouter(); // Hook para redirecionamento
  const menuRef = useRef<HTMLDivElement>(null); // Referência para o menu

  // Função para alternar a abertura e fechamento do menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Função de logout
  const handleLogout = async () => {
    try {
      await signOut(auth); // Firebase signOut
      router.push('/login'); // Redireciona para a página de login após o logout
    } catch (error) {
      console.error('Erro ao fazer logout: ', error);
    }
  };

  const closeMenu = () => {
    setMenuOpen(false); // Função para fechar o menu
  };

  // Fechar o menu ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu(); // Fechar o menu se clicar fora dele
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fechar o menu ao navegar para outra página
  useEffect(() => {
    closeMenu();
  }, [router.pathname]);

  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkUserRole = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().tipo === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };

    checkUserRole();
  }, [auth.currentUser]);

  const noHeaderRoutes = ['/login', '/register', '/esquecisenha'];

  return (
    <div className={styles.layout}>
      {!noHeaderRoutes.includes(router.pathname) && (
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <Image
              src="/images/logo.png"
              alt="Logo Frida Kids"
              width={150}
              height={150}
            />

            <div className={styles.menuIcon} onClick={toggleMenu}>
              {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </div>

            <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} ref={menuRef}>
              {menuOpen && (
                <div className={styles.closeMenuIcon} onClick={toggleMenu}>
                  <FaTimes size={24} />
                </div>
              )}

              <Link className={styles.headerLinks} href="/" onClick={closeMenu}>Agendamento</Link>
              <Link className={styles.headerLinks} href="/Agendamentos" onClick={closeMenu}>Meus Agendamentos</Link>
              <Link className={styles.headerLinks} href="/profile" onClick={closeMenu}>Meu Perfil</Link>

              {/* Botão de administrador visível apenas para admin */}
              {isAdmin && (
                <Link className={styles.headerLinks} href="/admin" onClick={closeMenu}>
                  Painel do Administrador
                </Link>
              )}

              {menuOpen && (
                <div className={styles.logoutContainer}>
                  <button
                    className={styles.logoutButton}
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                    style={{ backgroundColor: 'red', color: 'white' }}
                  >
                    <FaSignOutAlt size={18} style={{ marginRight: '8px' }} />
                    Logout
                  </button>
                </div>
              )}
            </nav>

            {!menuOpen && (
              <div className={styles.logoutDesktop}>
                <button
                  className={styles.logoutButton}
                  onClick={handleLogout}
                  style={{ backgroundColor: 'red', color: 'white', marginLeft: '15px' }}
                >
                  <FaSignOutAlt size={18} style={{ marginRight: '8px' }} />
                  Logout
                </button>
              </div>
            )}
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
            <p>Horários de funcionamento: Ter-Sab: 08:30h às 18:30h</p>
            <div className={styles.socialMedia}>
              <a href="https://www.instagram.com/frida.kids_?igsh=MXY4dHN5aHpkZjRuOA==" target="_blank" rel="noopener noreferrer">
                <FaInstagram size={24} color="white" />
              </a>
            </div>
          </div>
        </div>
        <p>© 2025 FridaKids - Todos os direitos reservados.</p>
        <p>Desenvolvido por DPS</p>
      </footer>
    </div>
  );
};

export default Layout;
