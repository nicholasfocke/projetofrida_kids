import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'; // Firestore
import { auth, firestore } from '../firebase/firebaseConfig'; // Configuração do Firebase
import { onAuthStateChanged } from 'firebase/auth'; // Para pegar o usuário logado
import { useRouter } from 'next/router'; // Para redirecionamento
import styles from './agendamentos.module.css'; // Estilos personalizados
import { format, isAfter, isBefore, isSameDay, addMinutes, parseISO } from 'date-fns'; // Manipulação de datas
import { ptBR } from 'date-fns/locale'; // Locale para português

interface Agendamento {
  id: string;
  data: string;
  hora: string;
  servico: string;
  nomeCrianca: string;
  status: string;
  funcionaria: string;
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
              funcionaria: agendamentoData.funcionaria || '',
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

  useEffect(() => {
    const checkAgendamentos = async () => {
      const now = new Date();
      agendamentos.forEach(async (agendamento) => {
        const agendamentoDateTime = new Date(`${agendamento.data}T${agendamento.hora}`);
        const thirtyMinutesLater = addMinutes(agendamentoDateTime, 30);

        if (isAfter(now, thirtyMinutesLater) && agendamento.status === 'agendado') {
          try {
            const agendamentoRef = doc(firestore, 'agendamentos', agendamento.id);
            await updateDoc(agendamentoRef, {
              status: 'concluído',
            });

            setAgendamentos((prev) => prev.filter((item) => item.id !== agendamento.id));
          } catch (error) {
            console.error('Erro ao atualizar o status do agendamento: ', error);
          }
        }
      });
    };

    if (agendamentos.length > 0) {
      const intervalId = setInterval(checkAgendamentos, 60000);

      return () => clearInterval(intervalId);
    }
  }, [agendamentos]);

  const handleRemove = async (id: string) => {
    const agendamentoToDelete = agendamentos.find((agendamento) => agendamento.id === id);
    if (!agendamentoToDelete || !user) return;

    try {
      await deleteDoc(doc(firestore, 'agendamentos', id));
      setAgendamentos((prev) => prev.filter((agendamento) => agendamento.id !== id));

      // Envia e-mail de confirmação de exclusão
      await sendDeleteConfirmationEmail(user.email, agendamentoToDelete);
    } catch (error) {
      console.error('Erro ao remover agendamento: ', error);
      setError('Erro ao remover o agendamento.');
    }
  };

  // Função para enviar e-mail de confirmação de exclusão
  const sendDeleteConfirmationEmail = async (email: string, agendamento: Agendamento) => {
    try {
      console.log('Enviando e-mail de exclusão com os dados:', {
        email,
        userId: user?.uid,
        agendamentoId: agendamento.id, 
      });
  
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userId: user?.uid, 
          date: agendamento.data, 
          service: agendamento.servico,
          time: agendamento.hora,
          funcionaria: agendamento.funcionaria,
          isDelete: true,
        }),
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de confirmação de exclusão:', error);
    }
  };
  

  const handleEdit = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento);
  };

  const handleSaveEdit = async () => {
    if (!editingAgendamento) return;

    const now = new Date(); // Data e hora atuais
    const selectedDate = new Date(editingAgendamento.data); // Data selecionada no agendamento
    const dayOfWeek = selectedDate.getDay(); // 6 = Domingo, 0 = Segunda

    // Verificação para bloquear domingos e segundas-feiras 
    const isSundayOrMonday = dayOfWeek === 6 || dayOfWeek === 0;

    // Ajustar a data atual para o início do dia (00:00)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Bloquear datas passadas e o próprio dia de hoje
    const isPastOrTodayDate = selectedDate <= today;

    // Verificação de conflitos de horários para a funcionária
    const isTimeBookedForFuncionaria = agendamentos.some(
      (a) =>
        a.hora === editingAgendamento.hora &&
        a.data === editingAgendamento.data &&
        a.funcionaria === editingAgendamento.funcionaria &&
        a.id !== editingAgendamento.id
    );

    // Bloquear agendamento em domingos (6) e segundas (1)
    if (isSundayOrMonday) {
      setError('O salão está fechado aos domingos e segundas-feiras.');
      return;
    }

    // Bloquear datas passadas e hoje
    if (isPastOrTodayDate) {
      setError('Você não pode agendar para uma data que já passou ou para hoje. Se quiser agendar para hoje, remova este agendamento e faça um novo.');
      return;
    }

    // Verificar se o horário já está ocupado
    if (isTimeBookedForFuncionaria) {
      setError(`Esse horário já está agendado para a ${editingAgendamento.funcionaria}.`);
      return;
    }

    // Verificação de campos obrigatórios
    if (
      !editingAgendamento.servico ||
      !editingAgendamento.data ||
      !editingAgendamento.hora ||
      !editingAgendamento.nomeCrianca ||
      !editingAgendamento.funcionaria
    ) {
      setError('Preencha todos os campos.');
      return;
    }

    // Tentar salvar a edição do agendamento
    try {
      const agendamentoRef = doc(firestore, 'agendamentos', editingAgendamento.id);
      await updateDoc(agendamentoRef, {
        servico: editingAgendamento.servico,
        data: editingAgendamento.data,
        hora: editingAgendamento.hora,
        nomeCrianca: editingAgendamento.nomeCrianca,
        funcionaria: editingAgendamento.funcionaria,
      });

      setAgendamentos((prev) =>
        prev.map((agendamento) =>
          agendamento.id === editingAgendamento.id ? editingAgendamento : agendamento
        )
      );

      // Chame a função para enviar o e-mail de confirmação de edição
      sendEditConfirmationEmail(user.email, editingAgendamento).catch((error) => {
        console.error('Erro ao enviar e-mail de confirmação:', error);
      });

      setEditingAgendamento(null);
      setError('');
    } catch (error) {
      console.error('Erro ao salvar alterações: ', error);
    }
};

// Função para enviar e-mail de confirmação de edição
const sendEditConfirmationEmail = async (email: string, agendamento: Agendamento) => {
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        userId: user.uid,
        date: agendamento.data,
        service: agendamento.servico,
        time: agendamento.hora,
        funcionaria: agendamento.funcionaria,
        isEdit: true // Indicador de que o e-mail é de edição
      }),
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de confirmação de edição:', error);
  }
};

  if (loading) {
    return <p>Carregando agendamentos...</p>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.titlecontaineragendamento}>Meus Agendamentos</h1>
      {agendamentos.length === 0 ? (
        <p>Não há agendamentos.</p>
      ) : (
        <div className={styles.cardsContainer}>
          {agendamentos.map((agendamento) => (
            <div key={agendamento.id} className={styles.card}>
{editingAgendamento && editingAgendamento.id === agendamento.id ? (
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
    <select
      value={editingAgendamento.funcionaria}
      onChange={(e) =>
        setEditingAgendamento({
          ...editingAgendamento,
          funcionaria: e.target.value,
        })
      }
    >
      <option value="" disabled>
        Selecione a Funcionária
      </option>
      <option value="Frida">Frida</option>
      <option value="Ana">Ana</option>
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
    <button
      onClick={() => handleRemove(editingAgendamento.id)}
      style={{ backgroundColor: 'red', color: 'white' }}
    >
      Remover
    </button>
    {error && <p style={{ color: 'white' }}>{error}</p>}
  </div>
) : (
  <>
    <h2>{agendamento.servico}</h2>
    <p>Criança: {agendamento.nomeCrianca}</p>
    <p>Data: {agendamento.data ? format(parseISO(agendamento.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}</p>
    <p>Hora: {agendamento.hora}</p>
    <p>Funcionária: {agendamento.funcionaria}</p>
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