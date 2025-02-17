// Importar somente o que é necessário do SDK Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa o Firebase apenas se ainda não foi inicializado
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Configurando persistência de sessão
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log('Persistência de sessão configurada');
  })
  .catch((error) => {
    console.error('Erro ao configurar persistência de sessão:', error);
  });

// Exportar auth e firestore usando as funções apropriadas
export const firestore = getFirestore(app);
export { auth };
export default app;
