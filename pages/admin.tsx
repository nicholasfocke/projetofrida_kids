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
  valor?: number;
  formaPagamento?: string;
}

const AdminPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [error, setError] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<string>('');
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
          valor: agendamentoData.valor || null,
          formaPagamento: agendamentoData.formaPagamento || '',
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
    setValor(agendamento.valor || null);
    setFormaPagamento(agendamento.formaPagamento || '');
  };

  const sortAgendamentosByTime = (agendamentos: Agendamento[]) =>
    agendamentos.sort((a, b) => a.hora.localeCompare(b.hora));

  const getAgendamentosPorFuncionaria = (funcionaria: string) =>
    sortAgendamentosByTime(
      agendamentosDoDia.filter((agendamento) => agendamento.funcionaria === funcionaria)
    );

  const handleConcluirAgendamento = async (agendamentoId: string) => {
    if (!user || user.tipo !== 'admin') {
      setError('Você não tem permissão para alterar o status deste agendamento.');
      return;
    }

    const agendamentoRef = doc(firestore, 'agendamentos', agendamentoId);
    await updateDoc(agendamentoRef, { status: 'concluído', valor, formaPagamento });

    setAgendamentos((prevAgendamentos) =>
      prevAgendamentos.map((agendamento) =>
        agendamento.id === agendamentoId
          ? { ...agendamento, status: 'concluído', valor, formaPagamento }
          : agendamento
      )
    );

    if (selectedAgendamento && selectedAgendamento.id === agendamentoId) {
      setSelectedAgendamento({ ...selectedAgendamento, status: 'concluído', valor, formaPagamento });
    }

    setValor(null);
    setFormaPagamento('');
  };

  const calcularTotaisPorFormaPagamento = (funcionaria: string) => {
    return agendamentosDoDia
      .filter((agendamento) => agendamento.funcionaria === funcionaria)
      .reduce(
        (totais, agendamento) => {
          if (agendamento.formaPagamento) {
            totais[agendamento.formaPagamento] += agendamento.valor || 0;
          }
          return totais;
        },
        { cartao: 0, pix: 0, dinheiro: 0 }
      );
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

      {selectedDate && (
        <div className={styles.agendamentoContainer}>
          {['Frida', 'Ana'].map((funcionaria) => {
            const agendamentosFuncionaria = getAgendamentosPorFuncionaria(funcionaria);
            const totais = calcularTotaisPorFormaPagamento(funcionaria);

            return (
              <div key={funcionaria} className={styles.funcionariaColumn}>
                <h3>{funcionaria}</h3>
                {agendamentosFuncionaria.length > 0 ? (
                  <ul className={styles.agendamentoList}>
                    {agendamentosFuncionaria.map((agendamento) => (
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
                <div className={styles.totais}>
                  <h4>Totais por Forma de Pagamento</h4>
                  <p><strong>Cartão:</strong> R$ {totais.cartao.toFixed(2)}</p>
                  <p><strong>Pix:</strong> R$ {totais.pix.toFixed(2)}</p>
                  <p><strong>Dinheiro:</strong> R$ {totais.dinheiro.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
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
            <div className={styles.conclusaoForm}>
              <input
                type="number"
                placeholder="Valor do Corte"
                value={valor || ''}
                onChange={(e) => setValor(parseFloat(e.target.value))}
              />
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option value="">Selecione a Forma de Pagamento</option>
                <option value="cartao">Cartão</option>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
              <button
                className={styles.statusButton}
                onClick={() => handleConcluirAgendamento(selectedAgendamento.id)}
              >
                Marcar como Concluído
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;