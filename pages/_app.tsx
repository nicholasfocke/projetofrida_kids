import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';
import Layout from '../components/Layout';


function MyApp({ Component, pageProps }) {
  return (
    
    <Layout>
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
    </Layout>
  );
}

export default MyApp;
