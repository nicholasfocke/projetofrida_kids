import ProtectedRoute from '../components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar'; // Importar react-calendar
import 'react-calendar/dist/Calendar.css'; // Importar CSS do calendário
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'; // Firestore
import { auth, firestore } from '../firebase/firebaseConfig'; // Configuração do Firebase
import { onAuthStateChanged } from 'firebase/auth'; // Para pegar o usuário logado
import styles from './index.module.css'; // Importando o CSS module
import { format, getYear } from 'date-fns'; // Biblioteca de manipulação de datas
import { ptBR } from 'date-fns/locale'; // Localização para datas

const Index = () => {
  const [user, setUser] = useState(null); // Estado para guardar o usuário logado
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    service: '',
    childName: '',
    funcionaria: '', 
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [error, setError] = useState(''); // Para exibir erros de validação
  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

  // Lógica para verificar horários disponíveis para a funcionária selecionada
  useEffect(() => {
    if (!selectedDate || !appointmentData.funcionaria) return;

    const fetchAvailableTimes = async () => {
      const appointmentsQuery = query(
        collection(firestore, 'appointments'),
        where('date', '==', format(selectedDate, 'yyyy-MM-dd')),
        where('funcionaria', '==', appointmentData.funcionaria)
      );

      const appointmentDocs = await getDocs(appointmentsQuery);
      const bookedTimes = appointmentDocs.docs.map((doc) => doc.data().time);
      const filteredTimes = times.filter((time) => !bookedTimes.includes(time));

      setAvailableTimes(filteredTimes);
    };

    fetchAvailableTimes();
  }, [selectedDate, appointmentData.funcionaria]);

  useEffect(() => {
    // Verificar se o usuário está logado
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // Salvar o usuário logado
      } else {
        setUser(null); // Se não houver usuário logado
      }
    });
    return () => unsubscribe(); // Limpar o listener ao desmontar o componente
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAppointmentData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  // Função para verificar se a data é válida (não pode ser domingo, segunda ou anterior ao dia atual)
  const isDateValid = (date: Date) => {
    const today = new Date();
    const isMonday = date.getDay() === 1; // Segunda-feira
    const isSunday = date.getDay() === 0; // Domingo
    const isPastDay = format(date, 'yyyy-MM-dd') < format(today, 'yyyy-MM-dd'); // Bloqueia dias anteriores ao dia atual
    const isNotCurrentYear = getYear(date) !== getYear(today); // Bloquear anos diferentes do atual

    return !isPastDay && !isMonday && !isSunday && !isNotCurrentYear;
  };

  const handleDateChange = (date: Date) => {
    if (!isDateValid(date)) {
      setError('Você não pode agendar para datas passadas, domingos, segundas ou anos fora do atual.');
      setSelectedDate(null); // Limpar a data se for inválida
      return;
    }

    setSelectedDate(date);
    setAvailableTimes(getAvailableTimesForDay(date)); // Atualizar os horários disponíveis
    setAppointmentData({
      ...appointmentData,
      date: format(date, 'yyyy-MM-dd'), // Formato yyyy-mm-dd para salvar no Firebase
    });
    setError(''); // Limpar mensagem de erro
  };

  const handleTimeChange = (time: string) => {
    setAppointmentData({
      ...appointmentData,
      time: time,
    });
  };

  // email
  const sendConfirmationEmail = async (email: string, userId: string, date: string, service: string, time: string, funcionaria: string) => {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userId, date, service, time, funcionaria }),
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

    if (!appointmentData.funcionaria) {
      setError('Você precisa escolher uma funcionária antes de enviar.');
      return;
    }

    if (!appointmentData.date) {
      setError('Você precisa escolher uma data antes de enviar.');
      return;
    }

    if (!appointmentData.time) {
      setError('Você precisa escolher um horário antes de enviar.');
      return;
    }

    // Verificar se já existe um agendamento para essa data, hora e funcionária
    const q = query(
      collection(firestore, 'agendamentos'),
      where('data', '==', appointmentData.date),
      where('hora', '==', appointmentData.time),
      where('funcionaria', '==', appointmentData.funcionaria) // Verificar se a funcionária já está ocupada
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      setError(`Esse horário com a ${appointmentData.funcionaria} já foi agendado para outro cliente.`); // Melhorar a mensagem de erro
      return;
    }

    try {
      // Criar o agendamento no Firestore
      await addDoc(collection(firestore, 'agendamentos'), {
        nomeCrianca: appointmentData.childName,
        servico: appointmentData.service,
        data: appointmentData.date,
        hora: appointmentData.time,
        usuarioId: user?.uid, // UID do usuário logado
        usuarioEmail: user?.email, // Email do usuário logado (opcional)
        status: 'agendado', // Adicionando o status "agendado"
        funcionaria: appointmentData.funcionaria, // Salvar a funcionária escolhida
      });

      // Enviar o e-mail de confirmação
      await sendConfirmationEmail(user.email, user.uid, appointmentData.date, appointmentData.service, appointmentData.time, appointmentData.funcionaria);


      alert('Agendamento realizado com sucesso!');
      
      // Limpar o formulário
      setAppointmentData({
        date: '',
        time: '',
        service: '',
        childName: '',
        funcionaria: '', // Reset funcionaria to empty
      });
      setSelectedDate(null);
      setAvailableTimes([]);
      setError('');
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setError('Erro ao salvar o agendamento. Tente novamente.');
    }
  };

  // Lógica para desabilitar horários anteriores ao horário atual, se o usuário estiver agendando para o dia atual
  const getAvailableTimesForDay = (date: Date) => {
    const now = new Date();
    if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      return times.filter((time) => {
        const [hours, minutes] = time.split(':');
        const appointmentTime = new Date();
        appointmentTime.setHours(parseInt(hours));
        appointmentTime.setMinutes(parseInt(minutes));
        return appointmentTime > now; // Retorna apenas horários futuros no dia atual
      });
    }
    return times; // Se não for o dia atual, todos os horários estão disponíveis
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Agendar Serviço</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>} {/* Exibe mensagem de erro */}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
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
              </select>
            </div>

            <div className={styles.formGroupCalendar}>
              <input
                type="text"
                id="childName"
                name="childName"
                placeholder="Nome da Criança"
                value={appointmentData.childName}
                onChange={handleInputChange}
                required
              />

              <div className={styles.formGroup}>
              <label htmlFor="funcionaria"></label>
              <select
                name="funcionaria"
                value={appointmentData.funcionaria}
                onChange={handleInputChange}
                required
              >
                <option value="">Selecione uma funcionária</option> {/* Para forçar a escolha */}
                <option value="Frida">Frida</option>
                <option value="Ana">Ana</option>
              </select>
            </div>
              
              <Calendar
                className={styles.reactCalendar}
                onChange={handleDateChange}
                value={selectedDate}
                tileDisabled={({ date }) => !isDateValid(date)} // Desabilitar datas inválidas no calendário
                maxDetail="month" // Impede a navegação para o ano, deixando apenas a navegação entre meses
                minDetail="month" // Limita para visualização apenas de meses, sem navegação de ano
                navigationLabel={({ date, label, locale, view }) => `${format(date, 'MMMM yyyy', { locale: ptBR })}`} // Personaliza o rótulo de navegação para remover setas duplas
                prev2Label={null} // Remove seta dupla anterior
                next2Label={null} // Remove seta dupla próxima
              />
              {selectedDate && (
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
              )}
            </div>

            <button type="submit" className={styles.button}>Agendar</button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
