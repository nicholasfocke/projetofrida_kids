import ProtectedRoute from '../components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import Modal from 'react-modal';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, addDoc, setDoc, doc } from 'firebase/firestore';
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
    time: '',
    service: '',
    nomeCrianca: '',
    funcionaria: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);

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

    try {
      const appointmentsQuery = query(
        collection(firestore, 'agendamentos'),
        where('data', '==', format(date, 'yyyy-MM-dd')),
        where('funcionaria', '==', funcionaria)
      );

      const appointmentDocs = await getDocs(appointmentsQuery);
      const bookedTimes = appointmentDocs.docs.map((doc) => doc.data().hora);

      const now = new Date();
      const allTimes = user?.tipo === 'admin' ? [...standardTimes, ...adminTimes] : standardTimes;

      const filteredTimes = allTimes.filter((time) => {
        if (bookedTimes.includes(time.trim()) || blockedTimes.includes(time.trim())) return false;

        if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
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

  const fetchBlockedTimes = async (date: Date) => {
    try {
      const blockedTimesQuery = query(
        collection(firestore, 'blockedTimes'),
        where('date', '==', format(date, 'yyyy-MM-dd'))
      );
      const blockedTimesSnapshot = await getDocs(blockedTimesQuery);
      const fetchedBlockedTimes = blockedTimesSnapshot.docs.map((doc) => doc.data().time);
      setBlockedTimes(fetchedBlockedTimes);
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

  const handleTimeClick = (time: string) => {
    setAppointmentData({
      ...appointmentData,
      time,
    });
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
          time: appointmentData.time,
          funcionaria: appointmentData.funcionaria,
          nomeCrianca: appointmentData.nomeCrianca,
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

    if (!user) {
      setError('Você precisa estar logado para fazer um agendamento.');
      return;
    }

    if (!appointmentData.funcionaria || !appointmentData.date || !appointmentData.time || !appointmentData.nomeCrianca) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    try {
      await addDoc(collection(firestore, 'agendamentos'), {
        nomeCrianca: appointmentData.nomeCrianca,
        servico: appointmentData.service,
        data: appointmentData.date,
        hora: appointmentData.time,
        usuarioId: user?.uid,
        usuarioEmail: user?.email,
        status: 'agendado',
        funcionaria: appointmentData.funcionaria,
      });

      router.push('/Agendamentos'); // Redireciona imediatamente após salvar
      sendConfirmationEmail(); // Envia o e-mail em segundo plano
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setError('Erro ao salvar o agendamento. Tente novamente.');
    }
  };

  const handleBlockDay = async () => {
    if (!selectedDate) return;

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedDays', formattedDate), { date: formattedDate });
      setBlockedDays((prev) => [...prev, formattedDate]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o dia:', error);
      setError('Erro ao bloquear o dia. Tente novamente.');
    }
  };

  const handleBlockTime = async () => {
    if (!selectedDate || !appointmentData.time) return;

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(firestore, 'blockedTimes', `${formattedDate}_${appointmentData.time}`), {
        date: formattedDate,
        time: appointmentData.time,
      });
      setBlockedTimes((prev) => [...prev, appointmentData.time]);
      setError('');
    } catch (error) {
      console.error('Erro ao bloquear o horário:', error);
      setError('Erro ao bloquear o horário. Tente novamente.');
    }
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Agendar Serviço</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}

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
            onRequestClose={() => setModalIsOpen(false)}
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

              <input
                type="text"
                name="nomeCrianca"
                value={appointmentData.nomeCrianca}
                onChange={handleInputChange}
                placeholder="Nome da Criança"
                required
                className={styles.inputnome}
              />

              <div>
                <strong>Horários Disponíveis:</strong>
                <div className={styles.times}>
                  {availableTimes.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`${styles.timeButton} ${appointmentData.time === time ? styles.activeTime : ''}`}
                      onClick={() => handleTimeClick(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {user?.tipo === 'admin' && appointmentData.time && (
                <button type="button" onClick={handleBlockTime} className={styles.blockButton}>
                  Bloquear Horário
                </button>
              )}

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setModalIsOpen(false)} className={styles.buttonSecondary}>
                  Cancelar
                </button>
                <button type="submit" className={styles.button}>
                  Confirmar
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