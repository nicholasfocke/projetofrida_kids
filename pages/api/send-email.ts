import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/firebaseConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, userId, date, service, times, funcionaria, nomesCriancas, isEdit, isDelete } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ message: 'userId e date são obrigatórios.' });
    }

    try {
      // Buscar nome e telefone do usuário no Firestore
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      const userName = userDoc.data()?.nome || "Usuário";
      const userPhone = userDoc.data()?.telefone || "Não informado";

      console.log(`Usuário encontrado: Nome - ${userName}, Telefone - ${userPhone}`);

      // Formatar a data para padrão brasileiro (DD/MM/YYYY)
      const [year, month, day] = date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const formattedDate = localDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Configuração do transporte de e-mail (Nodemailer)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Função para enviar e-mail ao usuário
      const sendUserEmail = async (subject: string, message: string) => {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject,
          html: message,
        });
      };

      // Função para enviar e-mail ao administrador
      const sendAdminEmail = async (subject: string, message: string) => {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: 'equipefridakids@gmail.com',
          subject,
          html: message,
        });
      };

      // Template de e-mail para o usuário
      const userMessage = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Olá, ${userName}!</h2>
          <p>${isDelete ? 'Seu agendamento foi excluído.' : isEdit ? 'Seu agendamento foi atualizado.' : 'Seu agendamento foi criado com sucesso!'}</p>
          <ul>
            <li><strong>Nome do usuário:</strong> ${userName}</li>
            <li><strong>Serviço:</strong> ${service}</li>
            <li><strong>Crianças:</strong> ${nomesCriancas.join(', ')}</li>
            <li><strong>Data:</strong> ${formattedDate}</li>
            <li><strong>Horários:</strong> ${times.join(', ')}</li>
            <li><strong>Funcionária:</strong> ${funcionaria}</li>
          </ul>
          <p>Se precisar de alguma alteração, entre em contato.</p>
          <p>Atenciosamente,<br><strong>Equipe FridaKids</strong></p>
        </div>
      `;

      // Template de e-mail para a administração
      const adminMessage = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Notificação de ${isDelete ? 'Exclusão' : isEdit ? 'Edição' : 'Novo'} Agendamento</h2>
          <p>O usuário <strong>${userName}</strong> (${email}) ${isDelete ? 'excluiu' : isEdit ? 'editou' : 'criou'} um agendamento.</p>
          <ul>
            <li><strong>Nome do usuário:</strong> ${userName}</li>
            <li><strong>Serviço:</strong> ${service}</li>
            <li><strong>Crianças:</strong> ${nomesCriancas.join(', ')}</li>
            <li><strong>Data:</strong> ${formattedDate}</li>
            <li><strong>Horários:</strong> ${times.join(', ')}</li>
            <li><strong>Funcionária:</strong> ${funcionaria}</li>
            <li><strong>Telefone do usuário:</strong> ${userPhone}</li>
          </ul>
          <p>Atenciosamente,<br><strong>Equipe FridaKids</strong></p>
        </div>
      `;

      // Enviar os e-mails
      if (isDelete) {
        await sendUserEmail('Confirmação de Exclusão do Agendamento', userMessage);
        await sendAdminEmail('Notificação de Exclusão de Agendamento', adminMessage);
      } else if (isEdit) {
        await sendUserEmail('Alteração Confirmada no Seu Agendamento', userMessage);
        await sendAdminEmail('Notificação de Edição de Agendamento', adminMessage);
      } else {
        await sendUserEmail('Confirmação do seu Agendamento', userMessage);
        await sendAdminEmail('Novo Agendamento Criado', adminMessage);
      }

      res.status(200).json({ message: 'Emails enviados com sucesso!' });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      res.status(500).json({ message: 'Erro ao enviar o email', error });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}