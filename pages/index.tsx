import ProtectedRoute from '../components/ProtectedRoute';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar'; // Importar react-calendar
import 'react-calendar/dist/Calendar.css'; // Importar CSS do calendário
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'; // Firestore
import { auth, firestore } from '../firebase/firebaseConfig'; // Configuração do Firebase
import { onAuthStateChanged } from 'firebase/auth'; // Para pegar o usuário logado
import styles from './index.module.css'; // Importando o CSS module

const Index = () => {
  const [user, setUser] = useState(null); // Estado para guardar o usuário logado
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    service: '',
    childName: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [error, setError] = useState(''); // Para exibir erros de validação
  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

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
    setAppointmentData({
      ...appointmentData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setAvailableTimes(times); // Simulação de todos os horários disponíveis
    setAppointmentData({
      ...appointmentData,
      date: date.toISOString().split('T')[0], // Formato yyyy-mm-dd
    });
  };

  const handleTimeChange = (time: string) => {
    setAppointmentData({
      ...appointmentData,
      time,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Você precisa estar logado para fazer um agendamento.');
      return;
    }

    // Verificar se a data é passada
    const today = new Date();
    const selectedDateTime = new Date(appointmentData.date);
    selectedDateTime.setHours(parseInt(appointmentData.time.split(':')[0]));
    selectedDateTime.setMinutes(parseInt(appointmentData.time.split(':')[1]));
    
    if (new Date(appointmentData.date) < today) {
      setError('Você não pode agendar para uma data que já passou.');
      return;
    }

    // Verificar se já existe um agendamento para essa data e hora
    const q = query(
      collection(firestore, 'agendamentos'),
      where('data', '==', appointmentData.date),
      where('hora', '==', appointmentData.time)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Se já existir um agendamento para esse horário
      setError('Este horário já está reservado por outro cliente.');
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
      });

      alert('Agendamento realizado com sucesso!');
      
      // Limpar o formulário
      setAppointmentData({
        date: '',
        time: '',
        service: '',
        childName: '',
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
    if (date.toDateString() === now.toDateString()) {
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
                className={styles.inputnome}
              />
            </div>

            <div className={styles.formGroup}>
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                tileDisabled={({ date }) => {
                  const day = date.getDay();
                  const today = new Date();
                  return day === 0 || day === 1 || date < new Date(today.toDateString()); // Desabilitar domingo, segunda e datas passadas
                }}
              />
            </div>

            {selectedDate && (
              <div className={styles.formGroup}>
                <label>Selecione um horário disponível:</label>
                <div className={styles.times}>
                  {getAvailableTimesForDay(selectedDate).map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`${styles.timeButton} ${appointmentData.time === time ? styles.activeTime : ''}`}
                      onClick={() => handleTimeChange(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className={styles.button}>Agendar</button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
