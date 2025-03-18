import ProtectedRoute from '../components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import Modal from 'react-modal';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, setDoc, doc, writeBatch, runTransaction } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './index.module.css';
import { format, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

Modal.setAppElement('#__next'); // Necessário para acessibilidade

const Index = () => {
  const [user, setUser] = useState(null);
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    times: [''], // Array para múltiplos horários
    service: '',
    nomesCriancas: [''], // Array para múltiplos nomes de crianças
    funcionaria: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false); // Novo estado para evitar piscar a mensagem
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); //  Novo estado para bloquear múltiplos cliques
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<{ date: string, time: string, funcionaria: string }[]>([]);

  const standardTimes = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30',
  ];

  const adminTimes = [
    '08:40', '09:40', '10:40', '11:40', '13:40', '14:40', '15:40', '16:40', '17:40', '18:40',
  ];

  const router = useRouter();

  const fetchAvailableTimes = async (date: Date | null, funcionaria: string) => {
    if (!date || !funcionaria) return;
    
    setIsLoadingTimes(true);
    
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
  
      // Verifica se a funcionária está bloqueada nesse dia
      const blockedDaysByEmployeeQuery = query(
        collection(firestore, 'blockedDaysByEmployee'),
        where('date', '==', formattedDate),
        where('funcionaria', '==', funcionaria)
      );
      const blockedDaysByEmployeeSnapshot = await getDocs(blockedDaysByEmployeeQuery);
  
      // Se a funcionária estiver bloqueada, não exibe horários
      if (!blockedDaysByEmployeeSnapshot.empty) {
        setAvailableTimes([]);
        return;
      }
  
      // Se a funcionária não estiver bloqueada, continua normalmente
      const appointmentsQuery = query(
        collection(firestore, 'agendamentos'),
        where('data', '==', formattedDate),
        where('funcionaria', '==', funcionaria)
      );
  
      const appointmentDocs = await getDocs(appointmentsQuery);
      const bookedTimes = appointmentDocs.docs.map((doc) => doc.data().hora);
  
      const now = new Date();
      const allTimes = user?.tipo === 'admin' ? [...standardTimes, ...adminTimes] : standardTimes;
  
      const filteredTimes = allTimes.filter((time) => {
        if (bookedTimes.includes(time.trim()) || blockedTimes.some(blockedTime => blockedTime.time === time.trim() && blockedTime.funcionaria === funcionaria)) return false;
  
        if (formattedDate === format(now, 'yyyy-MM-dd')) {
          const [hours, minutes] = time.split(':');
          const appointmentTime = new Date();
          appointmentTime.setHours(parseInt(hours));
          appointmentTime.setMinutes(parseInt(minutes));
          return appointmentTime > now;
        }
        return true;
      });
  
      setAvailableTimes(filteredTimes);
    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error);
    } finally {
      setIsLoadingTimes(false);
    }
  };
  
  

  const fetchBlockedDays = async () => {
    try {
      const blockedDaysQuery = query(collection(firestore, 'blockedDays'));
      const blockedDaysSnapshot = await getDocs(blockedDaysQuery);
      const fetchedBlockedDays = blockedDaysSnapshot.docs.map((doc) => doc.data().date);
      setBlockedDays(fetchedBlockedDays);
    } catch (error) {
      console.error('Erro ao buscar dias bloqueados:', error);
    }
  };

  const handleBlockDayForEmployee = async () => {
    if (!selectedDate || !appointmentData.funcionaria) return;
  
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedDaysByEmployee', `${formattedDate}_${appointmentData.funcionaria}`), {
        date: formattedDate,
        funcionaria: appointmentData.funcionaria,
      });
  
      // Atualiza os bloqueios apenas para a funcionária
      setBlockedTimes((prev) => [
        ...prev,
        { date: formattedDate, time: 'all', funcionaria: appointmentData.funcionaria },
      ]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o dia da funcionária:', error);
      setError('Erro ao bloquear o dia da funcionária. Tente novamente.');
    }
  };
  

  const fetchBlockedTimes = async (date: Date) => {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
  
      // Busca bloqueios gerais
      const blockedTimesQuery = query(
        collection(firestore, 'blockedTimes'),
        where('date', '==', formattedDate)
      );
      const blockedTimesSnapshot = await getDocs(blockedTimesQuery);
      const fetchedBlockedTimes = blockedTimesSnapshot.docs.map((doc) => doc.data() as { date: string, time: string, funcionaria: string });
  
      // Busca bloqueios por funcionária
      const blockedDaysByEmployeeQuery = query(
        collection(firestore, 'blockedDaysByEmployee'),
        where('date', '==', formattedDate)
      );
      const blockedDaysByEmployeeSnapshot = await getDocs(blockedDaysByEmployeeQuery);
      const fetchedBlockedDaysByEmployee = blockedDaysByEmployeeSnapshot.docs.map((doc) => doc.data() as { date: string, time: string, funcionaria: string });
  
      // Atualiza o estado de bloqueios
      setBlockedTimes([...fetchedBlockedTimes, ...fetchedBlockedDaysByEmployee]);
    } catch (error) {
      console.error('Erro ao buscar horários bloqueados:', error);
    }
  };
  

  useEffect(() => {
    fetchAvailableTimes(selectedDate, appointmentData.funcionaria);
  }, [selectedDate, appointmentData.funcionaria, user, blockedTimes]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userQuery = query(
            collection(firestore, 'users'),
            where('__name__', '==', currentUser.uid),
          );
          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setUser({ ...currentUser, tipo: userData.tipo || 'client' });
          } else {
            setUser({ ...currentUser, tipo: 'client' });
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      } else {
        setUser(null);
        router.push('/login');
      }
    });

    fetchBlockedDays();

    return () => unsubscribe();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAppointmentData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNomeCriancaChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newNomesCriancas = [...appointmentData.nomesCriancas];
    newNomesCriancas[index] = e.target.value;
    setAppointmentData((prevData) => ({
      ...prevData,
      nomesCriancas: newNomesCriancas,
    }));
  };

  const handleTimeClick = (time: string, index: number) => {
    if (!availableTimes.includes(time)) {
      setError('Este horário já foi reservado. Escolha outro horário disponível.');
      return;
    }
  
    const newTimes = [...appointmentData.times];
    newTimes[index] = time;
    setAppointmentData((prevData) => ({
      ...prevData,
      times: newTimes,
    }));
    setError(''); // Limpa o erro ao selecionar um horário válido
  };
  

  const addChild = () => {
    setAppointmentData((prevData) => ({
      ...prevData,
      nomesCriancas: [...prevData.nomesCriancas, ''],
      times: [...prevData.times, ''],
    }));
  };

  const isDateValid = (date: Date) => {
    const today = new Date();
    const isMonday = date.getDay() === 1;
    const isSunday = date.getDay() === 0;
    const isPastDay = format(date, 'yyyy-MM-dd') < format(today, 'yyyy-MM-dd');
    const isNotCurrentYear = getYear(date) !== getYear(today);
    const isBlockedDay = blockedDays.includes(format(date, 'yyyy-MM-dd'));

    // Permitir que administradores agendem em qualquer dia, mas destacar dias bloqueados
    if (user?.tipo === 'admin') {
      return !isPastDay && !isNotCurrentYear;
    }

    // Bloquear domingos, segundas, datas passadas e dias bloqueados para usuários comuns
    return !isPastDay && !isMonday && !isSunday && !isNotCurrentYear && !isBlockedDay;
  };

  const handleDateClick = (date: Date) => {
    if (!isDateValid(date)) {
      setError('Você não pode agendar para datas passadas, domingos, segundas, anos fora do atual ou dias bloqueados.');
      setSelectedDate(null);
      return;
    }

    setSelectedDate(date);
    setAppointmentData({
      ...appointmentData,
      date: format(date, 'yyyy-MM-dd'),
    });
    setError('');
    setModalIsOpen(true); // Abre o modal
    fetchBlockedTimes(date); // Buscar horários bloqueados para a data selecionada
  };

  const sendConfirmationEmail = async () => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.uid,
          date: appointmentData.date,
          service: appointmentData.service,
          times: appointmentData.times,
          funcionaria: appointmentData.funcionaria,
          nomesCriancas: appointmentData.nomesCriancas,
          isEdit: false,
          isDelete: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar email de confirmação');
      }
    } catch (error) {
      console.error('Erro ao enviar o email:', error);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Impede múltiplos envios
    
    setIsSubmitting(true); // Bloqueia o botão

    if (!user) {
      setError('Você precisa estar logado para fazer um agendamento.');
      setIsSubmitting(false);
      return;
    }

    if (!appointmentData.funcionaria || !appointmentData.date || appointmentData.times.some(time => !time) || appointmentData.nomesCriancas.some(nome => !nome)) {
      setError('Todos os campos são obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const appointmentsQuery = query(
          collection(firestore, 'agendamentos'),
          where('data', '==', appointmentData.date),
          where('funcionaria', '==', appointmentData.funcionaria),
          where('hora', 'in', appointmentData.times)
        );

        const appointmentDocs = await getDocs(appointmentsQuery);

        if (!appointmentDocs.empty) {
          const horariosOcupados = appointmentDocs.docs.map(doc => doc.data().hora);
          setAvailableTimes(availableTimes.filter(time => !horariosOcupados.includes(time)));
          throw new Error(`Os horários ${horariosOcupados.join(', ')} já foram reservados. Por favor, escolha outro horário disponível.`);
        }

        appointmentData.nomesCriancas.forEach((nome, index) => {
          const appointmentRef = doc(collection(firestore, 'agendamentos'));
          transaction.set(appointmentRef, {
            nomeCrianca: nome,
            servico: appointmentData.service,
            data: appointmentData.date,
            hora: appointmentData.times[index],
            usuarioId: user?.uid,
            usuarioEmail: user?.email,
            status: 'agendado',
            funcionaria: appointmentData.funcionaria,
          });
        });
      });

      router.push('/Agendamentos'); 
      await sendConfirmationEmail();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setError(error.message || 'Erro ao salvar o agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false); // Libera o botão após o processamento
    }
  };

  
  
  const handleBlockDay = async () => {
    if (!selectedDate) return;

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedDays', formattedDate), {
        date: formattedDate,
      });
      setBlockedDays((prev) => [...prev, formattedDate]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o dia:', error);
      setError('Erro ao bloquear o dia. Tente novamente.');
    }
  };

  const handleBlockTime = async () => {
    if (!selectedDate || !appointmentData.times[0] || !appointmentData.funcionaria) return;

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedTimes', `${formattedDate}_${appointmentData.times[0]}_${appointmentData.funcionaria}`), {
        date: formattedDate,
        time: appointmentData.times[0],
        funcionaria: appointmentData.funcionaria,
      });
      setBlockedTimes((prev) => [...prev, { date: formattedDate, time: appointmentData.times[0], funcionaria: appointmentData.funcionaria }]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o horário:', error);
      setError('Erro ao bloquear o horário. Tente novamente.');
    }
  };

  const handleCancel = () => {
    // Resetar o estado do appointmentData e availableTimes
    setAppointmentData({
      date: '',
      times: [''],
      service: '',
      nomesCriancas: [''],
      funcionaria: '',
    });
    setAvailableTimes([]);
    setModalIsOpen(false);
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Agendar Serviço</h2>

          <Calendar
            className={styles.reactCalendar}
            onClickDay={handleDateClick}
            value={selectedDate}
            tileDisabled={({ date }) => !isDateValid(date)}
            tileClassName={({ date, view }) =>
              view === 'month' && blockedDays.includes(format(date, 'yyyy-MM-dd'))
                ? styles.blockedDay
                : ''
            }
          />

          {user?.tipo === 'admin' && selectedDate && (
            <button onClick={handleBlockDay} className={styles.blockButton}>
              Bloquear Dia
            </button>
          )}

          <Modal
            isOpen={modalIsOpen}
            onRequestClose={handleCancel}
            className={styles.modalContent}
            overlayClassName={styles.modalOverlay}
          >
            <h3>Agendar Serviço para {format(selectedDate || new Date(), 'dd/MM/yyyy')}</h3>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <select
                  id="service"
                  name="service"
                  value={appointmentData.service}
                  onChange={handleInputChange}
                  required
                  className={styles.inputoption}
                >
                  <option value="" disabled>Selecione um serviço</option>
                  <option value="Corte de cabelo">Corte de cabelo</option>
                  <option value="Franja">Franja</option>
                  <option value="Penteado">Penteado</option>
                  <option value="Hidratação">Hidratação</option>
                  <option value="Maquiagem">Maquiagem</option>
                  <option value="Maquiagem e Penteado">Maquiagem e Penteado</option>
                </select>

                <select
                  name="funcionaria"
                  value={appointmentData.funcionaria}
                  onChange={(e) => {
                    handleInputChange(e);
                    fetchAvailableTimes(selectedDate, e.target.value); // Atualizar horários disponíveis ao selecionar funcionária
                  }}
                  required
                  className={styles.inputoption}
                >
                  <option value="">Selecione uma funcionária</option>
                  <option value="Frida">Frida</option>
                  <option value="Ana">Ana</option>
                </select>
              </div>

              {appointmentData.nomesCriancas.map((nome, index) => (
                <div key={index} className={styles.inputGroup}>
                  <input
                    type="text"
                    name={`nomeCrianca-${index}`}
                    value={nome}
                    onChange={(e) => handleNomeCriancaChange(e, index)}
                    placeholder="Nome da Criança"
                    required
                    className={styles.inputnome}
                  />
                </div>
              ))}

              {isLoadingTimes ? (
                <p style={{ color: 'blue', fontWeight: 'bold', marginTop: '10px' }}>
                  Carregando horários disponíveis...
                </p>
              ) : availableTimes.length > 0 ? (
                <div>
                  <strong>Horários Disponíveis:</strong>
                  <div className={styles.times}>
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`${styles.timeButton} ${appointmentData.times.includes(time) ? styles.activeTime : ''}`}
                        onClick={() => handleTimeClick(time, appointmentData.times.length - 1)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                appointmentData.funcionaria && !isLoadingTimes && ( // Só exibe a mensagem se o carregamento já terminou
                  <p style={{ color: 'red', fontWeight: 'bold', marginTop: '10px' }}>
                    Todos os horários nesta data para a funcionária já foram reservados. Entre em contato conosco para possivel encaixe.
                  </p>
                )
              )}


              <button type="button" onClick={addChild} className={styles.buttonSecondary}>
                Adicionar Outro Filho
              </button>

              {user?.tipo === 'admin' && appointmentData.times[0] && (
                <button type="button" onClick={handleBlockTime} className={styles.blockButton}>
                  Bloquear Horário
                </button>
              )}

              {user?.tipo === 'admin' && appointmentData.funcionaria && (
                <button type="button" onClick={handleBlockDayForEmployee} className={styles.blockButton}>
                  Bloquear Dia da Funcionária
                </button>
              )}


              {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

              <div className={styles.modalFooter}>
                <button type="button" onClick={handleCancel} className={styles.buttonSecondary}>
                  Cancelar
                </button>
                <button type="submit" className={styles.button} disabled={isSubmitting}>
                  {isSubmitting ? 'Aguarde...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;