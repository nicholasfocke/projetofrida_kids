import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/firebaseConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, userId, date, service, time, funcionaria, nomeCrianca, isEdit, isDelete } = req.body;

    // Verifique se `userId` e `date` estão definidos
    if (!userId || !date) {
      return res.status(400).json({ message: 'userId e date são obrigatórios.' });
    }

    try {
      // Obtenha o nome e telefone do usuário
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      const userName = userDoc.data()?.nome;
      const userPhone = userDoc.data()?.telefone;

      // Formatar a data
      const [year, month, day] = date.split('-').map(Number);
      const localDate = new Date(Date.UTC(year, month - 1, day));
      localDate.setUTCDate(localDate.getUTCDate() + 1);
      const formattedDate = localDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Configuração do Nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Funções de envio de email
      const sendUserEmail = async (subject: string, message: string) => {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject,
          html: message,
        });
      };

      const sendAdminEmail = async (subject: string, message: string) => {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: 'nicholasfocke05@gmail.com',
          subject,
          html: message,
        });
      };

      // Mensagens de email baseadas na ação
      const userMessage = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Olá, ${userName}!</h2>
          <p>${isDelete ? 'Seu agendamento foi excluído.' : isEdit ? 'Seu agendamento foi atualizado.' : 'Seu agendamento foi criado com sucesso!'}</p>
          <ul>
            <li><strong>Serviço:</strong> ${service}</li>
            <li><strong>Criança:</strong> ${nomeCrianca}</li>
            <li><strong>Data:</strong> ${formattedDate}</li>
            <li><strong>Horário:</strong> ${time}</li>
            <li><strong>Funcionária:</strong> ${funcionaria}</li>
          </ul>
          <p>Atenciosamente,<br>Equipe FridaKids</p>
        </div>
      `;

      const adminMessage = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Notificação de ${isDelete ? 'Exclusão' : isEdit ? 'Edição' : 'Criação'} de Agendamento</h2>
          <p>O usuário ${userName} (${email}) ${isDelete ? 'excluiu' : isEdit ? 'editou' : 'criou'} um agendamento.</p>
          <ul>
            <li><strong>Serviço:</strong> ${service}</li>
            <li><strong>Criança:</strong> ${nomeCrianca}</li>
            <li><strong>Data:</strong> ${formattedDate}</li>
            <li><strong>Horário:</strong> ${time}</li>
            <li><strong>Funcionária:</strong> ${funcionaria}</li>
            <li><strong>Telefone do usuário:</strong> ${userPhone}</li>
          </ul>
          <p>Atenciosamente,<br>Equipe FridaKids</p>
        </div>
      `;

      // Enviar emails com base na operação
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
