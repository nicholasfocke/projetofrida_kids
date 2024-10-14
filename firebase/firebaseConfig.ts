// Importar somente o que é necessário do SDK Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

// Exportar auth e firestore usando as funções apropriadas
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export default app;
