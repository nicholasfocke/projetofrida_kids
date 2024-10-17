import ProtectedRoute from '../components/ProtectedRoute';
import { useState } from 'react';
import Calendar from 'react-calendar'; // Importar react-calendar
import 'react-calendar/dist/Calendar.css'; // Importar CSS do calendário
import styles from './index.module.css'; // Importando o CSS module

const Index = () => {
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    service: '',
    childName: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const times = ['09:00','09:30', '10:00', '10:30', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAppointmentData({
      ...appointmentData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // Lógica para buscar horários disponíveis de acordo com a data selecionada (aqui simulamos todos os horários disponíveis)
    setAvailableTimes(times);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode adicionar a lógica para enviar o agendamento para o backend
    console.log('Agendamento enviado:', appointmentData);
  };

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Agendar Serviço</h2>

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
                <option value="" disabled>Selecione um serviço</option> {/* Simulação de placeholder */}
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
                  return day === 0 || day === 1; // Desabilitar domingo (0) e segunda-feira (1)
                }}
              />
            </div>

            {selectedDate && (
              <div className={styles.formGroup}>
                <label>Selecione um horário disponível:</label>
                <div className={styles.times}>
                  {availableTimes.map((time) => (
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
