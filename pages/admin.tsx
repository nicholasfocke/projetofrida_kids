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
  const [isLoading, setIsLoading] = useState(true); // Adicionado para controlar o carregamento
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const router = useRouter();

  const checkAdminStatus = async (uid: string) => {
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data()?.tipo === 'admin') {
      setUser(userDoc.data());
    } else {
      router.replace('/'); // Redireciona imediatamente para a página inicial
    }
    setIsLoading(false); // Define carregamento como concluído
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        checkAdminStatus(currentUser.uid);
      } else {
        router.replace('/login'); // Redireciona para login se não autenticado
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
    // Exibe uma mensagem de carregamento enquanto verifica as permissões
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

      {selectedDate && (
        <div className={styles.agendamentoContainer}>
          {/* Coluna da funcionária Frida */}
          <div className={styles.funcionariaColumn}>
            <h3>Frida</h3>
            {getAgendamentosPorFuncionaria('Frida').length > 0 ? (
              <ul className={styles.agendamentoList}>
                {getAgendamentosPorFuncionaria('Frida').map((agendamento) => (
                  <li
                    key={agendamento.id}
                    className={styles.agendamentoItem}
                    onClick={() => handleAgendamentoClick(agendamento)}
                  >
                    <strong>{agendamento.hora}</strong> - {agendamento.servico}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sem agendamentos</p>
            )}
          </div>

          {/* Coluna da funcionária Ana */}
          <div className={styles.funcionariaColumn}>
            <h3>Ana</h3>
            {getAgendamentosPorFuncionaria('Ana').length > 0 ? (
              <ul className={styles.agendamentoList}>
                {getAgendamentosPorFuncionaria('Ana').map((agendamento) => (
                  <li
                    key={agendamento.id}
                    className={styles.agendamentoItem}
                    onClick={() => handleAgendamentoClick(agendamento)}
                  >
                    <strong>{agendamento.hora}</strong> - {agendamento.servico}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sem agendamentos</p>
            )}
          </div>
        </div>
      )}

      {selectedAgendamento && (
        <div className={styles.details}>
          <h3>Detalhes do Agendamento</h3>
          <p><strong>Serviço:</strong> {selectedAgendamento.servico}</p>
          <p><strong>Criança:</strong> {selectedAgendamento.nomeCrianca}</p>
          <p><strong>Funcionária:</strong> {selectedAgendamento.funcionaria}</p>
          <p><strong>Hora:</strong> {selectedAgendamento.hora}</p>
          <p><strong>Usuário:</strong> {selectedAgendamento.usuarioNome} ({selectedAgendamento.usuarioEmail})</p>
          <p><strong>Telefone:</strong> {selectedAgendamento.telefone}</p>
          <p><strong>Status:</strong> {selectedAgendamento.status}</p>
          {selectedAgendamento.status === 'agendado' && (
            <button
              className={styles.statusButton}
              onClick={() => handleStatusChange(selectedAgendamento.id)}
            >
              Marcar como Concluído
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
