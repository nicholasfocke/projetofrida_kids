import { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="layout">
      <main>{children}</main>
      <footer className="footer">
        <p>© 2024 Meu App - Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Layout;
