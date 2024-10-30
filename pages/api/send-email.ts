import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/firebaseConfig';
import { format } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, userId, date, service, time, funcionaria, isEdit, isDelete } = req.body; // Inclui isDelete e isEdit

    try {
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      const userName = userDoc.data()?.nome;
      const formattedDate = format(new Date(date), 'dd/MM/yyyy');

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const message = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: isDelete ? 'Confirmação de Exclusão do Agendamento' : isEdit ? 'Alteração Confirmada no Seu Agendamento' : 'Confirmação do seu Agendamento',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Olá, ${userName}!</h2>
            <p>${isDelete ? 'Seu agendamento foi excluído conforme solicitado.' : isEdit ? 'Seu agendamento foi atualizado com sucesso!' : 'Estamos felizes em confirmar o seu agendamento conosco!'}</p>
            <ul>
              <li><strong>Serviço:</strong> ${service}</li>
              <li><strong>Data:</strong> ${formattedDate}</li>
              <li><strong>Horário:</strong> ${time}</li>
              <li><strong>Funcionária:</strong> ${funcionaria}</li>
            </ul>
            <p>${isDelete ? 'Se precisar de mais assistência, estamos aqui para ajudar.' : 'Se precisar alterar ou cancelar, você pode entrar em contato com a gente ou fazer isso diretamente no nosso site na página de Meus agendamentos.'}</p>
            <p>Atenciosamente,<br>Equipe do FridaKids</p>
          </div>
        `,
      };

      await transporter.sendMail(message);
      res.status(200).json({ message: 'Email enviado com sucesso!' });

    } catch (error) {
      res.status(500).json({ message: 'Erro ao enviar o email', error });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}
