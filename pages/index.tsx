import ProtectedRoute from '../components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import styles from './index.module.css';
import { format, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const times = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

  const router = useRouter();



  useEffect(() => {
    const fetchAvailableTimes = async () => {
      // Garantir que uma data foi selecionada antes de continuar
      if (!selectedDate) return;

      try {
        // Buscar os agendamentos no Firestore para a data selecionada
        const appointmentsQuery = query(
          collection(firestore, 'agendamentos'),
          where('data', '==', format(selectedDate, 'yyyy-MM-dd'))
        );

        const appointmentDocs = await getDocs(appointmentsQuery);

        // Mapear os horários já agendados, independentemente da funcionária
        const bookedTimes = appointmentDocs.docs.map((doc) => doc.data().hora);

        // Filtrar horários disponíveis removendo os que já estão agendados
        const now = new Date();
        const filteredTimes = times.filter((time) => {
          // Verificar se o horário já está agendado
          if (bookedTimes.includes(time.trim())) return false;

          // Se a data é hoje, remover horários que já passaram
          if (format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
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

    // Chamar a função sempre que um dos campos mudar
    fetchAvailableTimes();
  }, [selectedDate, appointmentData.funcionaria, appointmentData.service, appointmentData.nomeCrianca]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

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

    return !isPastDay && !isMonday && !isSunday && !isNotCurrentYear;
  };

  const handleDateChange = (date: Date) => {
    if (!isDateValid(date)) {
      setError('Você não pode agendar para datas passadas, domingos, segundas ou anos fora do atual.');
      setSelectedDate(null);
      return;
    }

    setSelectedDate(date);
    setAvailableTimes(getAvailableTimesForDay(date));
    setAppointmentData({
      ...appointmentData,
      date: format(date, 'yyyy-MM-dd'),
    });
    setError('');
  };

  const handleTimeChange = (time: string) => {
    setAppointmentData({
      ...appointmentData,
      time: time,
    });
  };

  const sendConfirmationEmail = async (email: string, userId: string, date: string, service: string, nomeCrianca: string, time: string, funcionaria: string) => {
    try {
      await fetch('/api/send-email', {
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
          isDelete: false
        }),
      });
    } catch (error) {
      console.error('Erro ao enviar o email de confirmação:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Você precisa estar logado para fazer um agendamento.');
      return;
    }

    if (!appointmentData.funcionaria || !appointmentData.date || !appointmentData.time) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    const q = query(
      collection(firestore, 'agendamentos'),
      where('data', '==', appointmentData.date),
      where('hora', '==', appointmentData.time),
      where('funcionaria', '==', appointmentData.funcionaria)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      setError(`Esse horário com a ${appointmentData.funcionaria} já foi agendado para outro cliente.`);
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

      sendConfirmationEmail(user.email, user.uid, appointmentData.date, appointmentData.service, appointmentData.nomeCrianca, appointmentData.time, appointmentData.funcionaria)
        .catch((error) => console.error('Erro ao enviar o email de confirmação:', error));

      alert('Agendamento realizado com sucesso!');

      setAppointmentData({
        date: '',
        time: '',
        service: '',
        nomeCrianca: '',
        funcionaria: '',
      });
      setSelectedDate(null);
      setAvailableTimes([]);
      setError('');

      router.push('/Agendamentos');
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setError('Erro ao salvar o agendamento. Tente novamente.');
    }
  };

  const getAvailableTimesForDay = (date: Date) => {
    const now = new Date();
    if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      return times.filter((time) => {
        const [hours, minutes] = time.split(':');
        const appointmentTime = new Date();
        appointmentTime.setHours(parseInt(hours));
        appointmentTime.setMinutes(parseInt(minutes));
        return appointmentTime > now;
      });
    }
    return times;
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Agendar Serviço</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <Calendar
            className={styles.reactCalendar}
            onChange={handleDateChange}
            value={selectedDate}
            tileDisabled={({ date }) => !isDateValid(date)}
            maxDetail="month"
            minDetail="month"
            navigationLabel={({ date, label, locale, view }) => `${format(date, 'MMMM yyyy', { locale: ptBR })}`}
            prev2Label={null}
            next2Label={null}
          />
          {selectedDate && (
            <div className={styles.formGroupCalendar}>
              <select
                name="time"
                value={appointmentData.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                required
              >
                <option value="">Selecione o horário</option>
                {availableTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          )}


          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Linha com os dois selects */}
            <div className={styles.formGroupRow}>
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
                <option value="Esmaltação">Esmaltação</option>
                <option value="Maquiagem">Maquiagem</option>
              </select>

              <select
                name="funcionaria"
                value={appointmentData.funcionaria}
                onChange={handleInputChange}
                required
                className={styles.inputoption}
              >
                <option value="">Selecione uma funcionária</option>
                <option value="Frida">Frida</option>
                <option value="Ana">Ana</option>
              </select>
            </div>

            {/* Campo para o nome da criança */}
            <div className={styles.formGroupCalendar}>
              <input
                type="text"
                id="nomeCrianca"
                name="nomeCrianca"
                placeholder="Nome da Criança"
                value={appointmentData.nomeCrianca}
                onChange={handleInputChange}
                required
                className={styles.inputnome}
              />
            </div>

            <button type="submit" className={styles.button}>Agendar</button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;