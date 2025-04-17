import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore'; // Firestore
import { auth, firestore } from '../firebase/firebaseConfig'; // Configuração do Firebase
import { onAuthStateChanged } from 'firebase/auth'; // Para pegar o usuário logado
import { useRouter } from 'next/router'; // Para redirecionamento
import styles from './agendamentos.module.css'; // Estilos personalizados
import { format, parseISO } from 'date-fns'; // Manipulação de datas
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

          // Ordenar agendamentos por data e hora em ordem crescente
          fetchedAgendamentos.sort((a, b) => {
            const dateA = new Date(`${a.data}T${a.hora}`);
            const dateB = new Date(`${b.data}T${b.hora}`);
            return dateA.getTime() - dateB.getTime();
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

  const handleRemove = async (id: string) => {
    const agendamentoToDelete = agendamentos.find((agendamento) => agendamento.id === id);
    if (!agendamentoToDelete || !user) return;

    // Exibe a confirmação para o usuário
    const confirmDelete = window.confirm('Deseja excluir o agendamento?');
    if (!confirmDelete) {
      // Se o usuário cancelar a exclusão, apenas retorna
      return;
    }

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
        nomeCrianca: agendamento.nomeCrianca,
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
          times: [agendamento.hora],
          funcionaria: agendamento.funcionaria,
          nomesCriancas: [agendamento.nomeCrianca],
          isDelete: true,
        }),
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail de confirmação de exclusão:', error);
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
              <h2>{agendamento.servico}</h2>
              <p>Criança: {agendamento.nomeCrianca}</p>
              <p>Data: {agendamento.data ? format(parseISO(agendamento.data), 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'}</p>
              <p>Hora: {agendamento.hora}</p>
              <p>Funcionária: {agendamento.funcionaria}</p>
              <p>Status: {agendamento.status}</p>
              <div className={styles.cardActions}>
                <button
                  className={styles.removeButton}
                  onClick={() => handleRemove(agendamento.id)}
                  style={{ backgroundColor: 'red', color: 'white' }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Agendamentos;