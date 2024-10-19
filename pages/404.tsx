import Link from 'next/link';
import Image from 'next/image';
import styles from './404.module.css'; 

const Custom404 = () => {
  return (
    <div className={styles.container}>
      <Image
        src="../images/404.svg" 
        alt="404 - Página não encontrada"
        width={400}
        height={400}
        className={styles.image}
      />
      <h1 className={styles.titleError}>404 - Página não encontrada</h1>
      <p className={styles.paragrafoError}>Desculpe, a página que você está procurando não existe ou foi removida.</p>
      <Link href="/" legacyBehavior>
        <a className={styles.link}>Voltar para a página inicial</a>
      </Link>
    </div>
  );
};

export default Custom404;
