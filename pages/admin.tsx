import { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Modal from 'react-modal';
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

interface Venda {
  id: string;
  data: string;
  produto: string;
  valor: number;
  formaPagamento: string;
  funcionaria: string;
}

const AdminPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [error, setError] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [produto, setProduto] = useState<string>('');
  const [funcionariaVenda, setFuncionariaVenda] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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

    const fetchVendas = async () => {
      const q = query(collection(firestore, 'vendas'));
      const querySnapshot = await getDocs(q);
      const fetchedVendas: Venda[] = [];

      for (const docSnap of querySnapshot.docs) {
        const vendaData = docSnap.data();
        fetchedVendas.push({
          id: docSnap.id,
          data: vendaData.data,
          produto: vendaData.produto,
          valor: vendaData.valor,
          formaPagamento: vendaData.formaPagamento,
          funcionaria: vendaData.funcionaria,
        });
      }

      setVendas(fetchedVendas);
    };

    if (user) {
      fetchAgendamentos();
      fetchVendas();
    }
  }, [user]);

  const agendamentosDoDia = agendamentos.filter((agendamento) =>
    selectedDate ? isSameDay(parseISO(agendamento.data), selectedDate) : false
  );

  const vendasDoDia = vendas.filter((venda) =>
    selectedDate ? isSameDay(parseISO(venda.data), selectedDate) : false
  );

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedAgendamento(null);
  };

  const handleAgendamentoClick = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setValor(agendamento.valor || null);
    setFormaPagamento(agendamento.formaPagamento || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAgendamento(null);
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

  const calcularTotaisVendasPorFormaPagamento = (funcionaria: string) => {
    return vendasDoDia
      .filter((venda) => venda.funcionaria === funcionaria)
      .reduce(
        (totais, venda) => {
          if (venda.formaPagamento) {
            totais[venda.formaPagamento] += venda.valor || 0;
          }
          return totais;
        },
        { cartao: 0, pix: 0, dinheiro: 0 }
      );
  };

  const handleRegistrarVenda = async () => {
    if (!produto || !valor || !formaPagamento || !funcionariaVenda || !selectedDate) {
      setError('Preencha todos os campos para registrar a venda.');
      return;
    }

    try {
      const novaVenda: Venda = {
        id: '', // Temporary id, will be replaced after addDoc
        data: format(selectedDate, 'yyyy-MM-dd'), // Usa a data selecionada no calendário
        produto,
        valor,
        formaPagamento,
        funcionaria: funcionariaVenda,
      };

      const docRef = await addDoc(collection(firestore, 'vendas'), novaVenda);
      const vendaComId = { ...novaVenda, id: docRef.id }; // Define o ID após a criação do documento
      setVendas((prevVendas) => [...prevVendas, vendaComId]);
      setProduto('');
      setValor(null);
      setFormaPagamento('');
      setFuncionariaVenda('');
      setError('');
    } catch (error) {
      setError('Erro ao registrar a venda.');
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

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Detalhes do Agendamento"
        className={styles.modal}
        overlayClassName={styles.overlay}
      >
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
      </Modal>

      <div className={styles.vendasContainer}>
        <h2>Registrar Venda de Produto</h2>
        <div className={styles.vendaForm}>
          <select
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
          >
            <option value="">Selecione o Produto</option>
            <option value="esmaltação">Esmaltação</option>
            <option value="shampoo">Shampoo</option>
            <option value="condicionador">Condicionador</option>
            <option value="cachos leavein">Cachos Leavein</option>
            <option value="leavein spray">Leavein Spray</option>
            <option value="queratan">Queratan</option>
            <option value="pomada">Pomada</option>
            <option value="bastão">Bastão</option>
            <option value="ampola">Ampola</option>
            <option value="Corte de cabelo (caso o marcar como concluido dê erro)">Corte de cabelo (caso o marcar como concluido dê erro)</option>
          </select>
          <input
            type="number"
            placeholder="Valor"
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
          <select
            value={funcionariaVenda}
            onChange={(e) => setFuncionariaVenda(e.target.value)}
          >
            <option value="">Selecione a Funcionária</option>
            <option value="Frida">Frida</option>
            <option value="Ana">Ana</option>
            <option value="Naely">Naely</option>
          </select>
          <button onClick={handleRegistrarVenda}>Registrar Venda</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {selectedDate && (
        <div className={styles.vendasContainer}>
          {['Frida', 'Ana', 'Naely'].map((funcionaria) => {
            const totaisVendas = calcularTotaisVendasPorFormaPagamento(funcionaria);

            return (
              <div key={funcionaria} className={styles.funcionariaColumn}>
                <h3>Vendas de {funcionaria}</h3>
                <div className={styles.totais}>
                  <h4>Totais por Forma de Pagamento</h4>
                  <p><strong>Cartão:</strong> R$ {totaisVendas.cartao.toFixed(2)}</p>
                  <p><strong>Pix:</strong> R$ {totaisVendas.pix.toFixed(2)}</p>
                  <p><strong>Dinheiro:</strong> R$ {totaisVendas.dinheiro.toFixed(2)}</p>
                </div>
                <ul className={styles.vendaList}>
                  {vendasDoDia
                    .filter((venda) => venda.funcionaria === funcionaria)
                    .map((venda) => (
                      <li key={venda.id} className={styles.vendaItem}>
                        <strong>{venda.produto}</strong> - R$ {venda.valor.toFixed(2)} ({venda.formaPagamento})
                      </li>
                    ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPage;