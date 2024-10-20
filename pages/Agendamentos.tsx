import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'; // Firestore
import { auth, firestore } from '../firebase/firebaseConfig'; // Configuração do Firebase
import { onAuthStateChanged } from 'firebase/auth'; // Para pegar o usuário logado
import { useRouter } from 'next/router'; // Para redirecionamento
import styles from './agendamentos.module.css'; // Estilos personalizados
import { format, isAfter, addMinutes, parseISO } from 'date-fns'; // Manipulação de datas
import { ptBR } from 'date-fns/locale'; // Locale para português

interface Agendamento {
  id: string;
  data: string;
  hora: string;
  servico: string;
  nomeCrianca: string;
  status: string;
}

const Agendamentos = () => {
  const [user, setUser] = useState(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null); // Estado para armazenar o agendamento que está sendo editado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const services = ['Corte de cabelo', 'Franja', 'Penteado']; // Serviços disponíveis
  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']; // Horários disponíveis

  const router = useRouter(); // Hook para redirecionamento

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login'); // Redireciona para login se o usuário não estiver autenticado
      }
    });

    return () => unsubscribe(); // Limpa o observador quando o componente desmonta
  }, [router]);

  useEffect(() => {
    const fetchAgendamentos = async () => {
      if (user) {
        const q = query(
          collection(firestore, 'agendamentos'),
          where('usuarioId', '==', user.uid),
          where('status', '==', 'agendado')
        );

        try {
          const querySnapshot = await getDocs(q);
          const fetchedAgendamentos: Agendamento[] = [];
          querySnapshot.forEach((doc) => {
            const agendamentoData = doc.data();
            fetchedAgendamentos.push({
              id: doc.id,
              data: agendamentoData.data,
              hora: agendamentoData.hora,
              servico: agendamentoData.servico,
              nomeCrianca: agendamentoData.nomeCrianca,
              status: agendamentoData.status,
            });
          });
          setAgendamentos(fetchedAgendamentos);
          setLoading(false);
        } catch (error) {
          setError('Erro ao buscar agendamentos.');
        }
      }
    };

    fetchAgendamentos();
  }, [user]);

  // Função para verificar se o agendamento passou 30 minutos e atualizá-lo para "concluído"
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      agendamentos.forEach(async (agendamento) => {
        const agendamentoDateTime = new Date(`${agendamento.data} ${agendamento.hora}`);
        const thirtyMinutesLater = addMinutes(agendamentoDateTime, 30);

        if (isAfter(now, thirtyMinutesLater) && agendamento.status === 'agendado') {
          // Atualizar status para 'concluído' no Firestore
          const agendamentoRef = doc(firestore, 'agendamentos', agendamento.id);
          await updateDoc(agendamentoRef, {
            status: 'concluído',
          });

          // Remover o agendamento da lista de agendamentos no frontend
          setAgendamentos((prev) => prev.filter((item) => item.id !== agendamento.id));
        }
      });
    }, 60000); // Verifica a cada 1 minuto

    return () => clearInterval(intervalId); // Limpar o intervalo ao desmontar o componente
  }, [agendamentos]);

  // Função para remover o agendamento
  const handleRemove = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'agendamentos', id));
      setAgendamentos((prev) => prev.filter((agendamento) => agendamento.id !== id));
    } catch (error) {
      console.error('Erro ao remover agendamento: ', error);
    }
  };

  // Função para editar o agendamento
  const handleEdit = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento); // Abrir o formulário de edição com o agendamento selecionado
  };

  // Função para salvar as alterações no agendamento
  const handleSaveEdit = async () => {
    if (editingAgendamento) {
      try {
        const agendamentoRef = doc(firestore, 'agendamentos', editingAgendamento.id);
        await updateDoc(agendamentoRef, {
          servico: editingAgendamento.servico,
          data: editingAgendamento.data,
          hora: editingAgendamento.hora,
          nomeCrianca: editingAgendamento.nomeCrianca,
        });

        // Atualizar o estado local com as alterações
        setAgendamentos((prev) =>
          prev.map((agendamento) =>
            agendamento.id === editingAgendamento.id ? editingAgendamento : agendamento
          )
        );

        setEditingAgendamento(null); // Fechar o formulário de edição
        setError('');
      } catch (error) {
        console.error('Erro ao salvar alterações: ', error);
      }
    }
  };

  if (loading) {
    return <p>Carregando agendamentos...</p>;
  }

  return (
    <div className={styles.container}>
      <h1>Meus Agendamentos</h1>
      {agendamentos.length === 0 ? (
        <p>Não há agendamentos.</p>
      ) : (
        <div className={styles.cardsContainer}>
          {agendamentos.map((agendamento) => (
            <div key={agendamento.id} className={styles.card}>
              {editingAgendamento && editingAgendamento.id === agendamento.id ? (
                // Formulário de edição
                <div className={styles.editForm}>
                  <h2>Editar Agendamento</h2>
                  <select
                    value={editingAgendamento.servico}
                    onChange={(e) =>
                      setEditingAgendamento({ ...editingAgendamento, servico: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Selecione um serviço
                    </option>
                    {services.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={editingAgendamento.data}
                    onChange={(e) =>
                      setEditingAgendamento({ ...editingAgendamento, data: e.target.value })
                    }
                  />
                  <select
                    value={editingAgendamento.hora}
                    onChange={(e) =>
                      setEditingAgendamento({ ...editingAgendamento, hora: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      Selecione um horário
                    </option>
                    {times.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editingAgendamento.nomeCrianca}
                    onChange={(e) =>
                      setEditingAgendamento({
                        ...editingAgendamento,
                        nomeCrianca: e.target.value,
                      })
                    }
                  />
                  <button onClick={handleSaveEdit}>Salvar</button>
                  {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
              ) : (
                // Exibição do agendamento
                <>
                  <h2>{agendamento.servico}</h2>
                  <p>Criança: {agendamento.nomeCrianca}</p>
                  <p>Data: {format(parseISO(agendamento.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  <p>Hora: {agendamento.hora}</p>
                  <p>Status: {agendamento.status}</p>

                  <div className={styles.cardActions}>
                    <button className={styles.editButton} onClick={() => handleEdit(agendamento)}>
                      Editar
                    </button>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemove(agendamento.id)}
                      style={{ backgroundColor: 'red', color: 'white' }}
                    >
                      Remover
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Agendamentos;
