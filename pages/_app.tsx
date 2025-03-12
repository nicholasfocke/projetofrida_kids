import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';
import Layout from '../components/Layout';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Corrige zoom inesperado no mobile e mantém responsividade */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <title>Frida Kids</title>
        <meta name="description" content="Sistema de agendamentos Frida Kids." />
      </Head>

      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
      <Analytics />
    </>
  );
}

export default MyApp;