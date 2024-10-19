// Importar somente o que é necessário do SDK Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCysxDkBAb4LERFRFPltOyMxGMbFH0IJ0A",
  authDomain: "fridakids-a0f1f.firebaseapp.com",
  projectId: "fridakids-a0f1f",
  storageBucket: "fridakids-a0f1f.appspot.com",
  messagingSenderId: "344032070158",
  appId: "1:344032070158:web:de42cd3addf58f8f87ca5f",
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
