import { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from './admin.module.css';

interface Agendamento {
  id: string;
  data: string;
  hora: string;
  servico: string;
  nomeCrianca: string;
  status: string;
  funcionaria: string;
  usuarioEmail: string;
  usuarioNome: string;
  telefone: string;
}

const AdminPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const checkAdminStatus = async (uid: string) => {
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data()?.tipo === 'admin') {
      setUser(userDoc.data());
    } else {
      router.replace('/');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        checkAdminStatus(currentUser.uid);
      } else {
        router.replace('/login');
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchAgendamentos = async () => {
      const q = query(collection(firestore, 'agendamentos'));
      const querySnapshot = await getDocs(q);
      const fetchedAgendamentos: Agendamento[] = [];

      for (const docSnap of querySnapshot.docs) {
        const agendamentoData = docSnap.data();

        const userDocRef = doc(firestore, 'users', agendamentoData.usuarioId);
        const userDoc = await getDoc(userDocRef);

        fetchedAgendamentos.push({
          id: docSnap.id,
          data: agendamentoData.data,
          hora: agendamentoData.hora,
          servico: agendamentoData.servico,
          nomeCrianca: agendamentoData.nomeCrianca,
          status: agendamentoData.status,
          funcionaria: agendamentoData.funcionaria,
          usuarioEmail: userDoc.exists() ? userDoc.data()?.email : '',
          usuarioNome: userDoc.exists() ? userDoc.data()?.nome : '',
          telefone: userDoc.exists() ? userDoc.data()?.telefone : '',
        });
      }

      setAgendamentos(fetchedAgendamentos);
    };

    if (user) {
      fetchAgendamentos();
    }
  }, [user]);

  const agendamentosDoDia = agendamentos.filter((agendamento) =>
    selectedDate ? isSameDay(parseISO(agendamento.data), selectedDate) : false
  );

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedAgendamento(null);
  };

  const handleAgendamentoClick = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
  };

  const sortAgendamentosByTime = (agendamentos: Agendamento[]) =>
    agendamentos.sort((a, b) => a.hora.localeCompare(b.hora));

  const getAgendamentosPorFuncionaria = (funcionaria: string) =>
    sortAgendamentosByTime(
      agendamentosDoDia.filter((agendamento) => agendamento.funcionaria === funcionaria)
    );

  const handleStatusChange = async (agendamentoId: string) => {
    if (!user || user.tipo !== 'admin') {
      setError('Você não tem permissão para alterar o status deste agendamento.');
      return;
    }

    const agendamentoRef = doc(firestore, 'agendamentos', agendamentoId);
    await updateDoc(agendamentoRef, { status: 'concluído' });

    setAgendamentos((prevAgendamentos) =>
      prevAgendamentos.map((agendamento) =>
        agendamento.id === agendamentoId
          ? { ...agendamento, status: 'concluído' }
          : agendamento
      )
    );

    if (selectedAgendamento && selectedAgendamento.id === agendamentoId) {
      setSelectedAgendamento({ ...selectedAgendamento, status: 'concluído' });
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Painel do Administrador</h1>

      <Calendar
        className={styles.calendar}
        onChange={handleDateChange}
        value={selectedDate}
        tileClassName={({ date, view }) =>
          view === 'month' &&
          agendamentos.some((agendamento) => isSameDay(parseISO(agendamento.data), date))
            ? styles.markedDay
            : ''
        }
        locale="pt-BR"
      />
    </div>
  );
};

export default AdminPage;
