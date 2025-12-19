
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contact, details, services, timeline, internalEstimate, lang } = req.body;
  
  // Usar la clave de Gemini
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  let aiSummary = "AI Summary unavailable.";

  // 1. GENERAR RESUMEN CON IA
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analyze this creative briefing and generate a professional summary in ${lang === 'es' ? 'Spanish' : lang === 'pl' ? 'Polish' : 'English'}.
        Project: ${details.projectName}
        Description: ${details.description}
        Services: ${services.join(', ')}
        Budget: ${timeline.budgetRange}
        Format: 1. Need analysis. 2. Technical recommendations. 3. Suggested next steps.
      `;
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      aiSummary = aiResponse.text || "No summary generated.";
    } catch (err) {
      console.error("Gemini Error:", err);
      aiSummary = "Error generating AI summary, but data was saved.";
    }
  }

  // 2. CONFIGURAR SMTP
  const smtpHost = process.env.SMTP_HOST || 'smtp.resend.com';
  const isResend = smtpHost.includes('resend');
  
  // IMPORTANTE: Para Resend el usuario debe ser 'resend'
  const authUser = isResend ? 'resend' : process.env.SMTP_USER;
  const authPass = process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 465,
    secure: true,
    auth: { user: authUser, pass: authPass },
  });

  try {
    // IMPORTANTE: Resend requiere que el 'from' sea un dominio verificado o 'onboarding@resend.dev'
    const fromEmail = isResend ? 'onboarding@resend.dev' : process.env.SMTP_USER;

    // 3. EMAIL PARA ARTURO
    await transporter.sendMail({
      from: `"The Smart Corner" <${fromEmail}>`,
      to: 'arturonaranxo@gmail.com',
      subject: `🚀 Nuevo Proyecto: ${details.projectName}`,
      html: `
        <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 20px;">
          <h1 style="color: #8b5cf6;">Briefing de: ${contact.fullName}</h1>
          <p><strong>Email Cliente:</strong> ${contact.email}</p>
          <p><strong>Servicios:</strong> ${services.join(', ')}</p>
          <p><strong>Rango Presupuesto:</strong> ${timeline.budgetRange}</p>
          <hr style="border: 1px solid #1e293b; margin: 30px 0;"/>
          <h2 style="color: #ec4899;">Resumen IA:</h2>
          <div style="background: #1e293b; padding: 25px; border-radius: 15px; font-style: italic; line-height: 1.6;">
            ${aiSummary.replace(/\n/g, '<br/>')}
          </div>
          <p style="font-size: 11px; color: #64748b; margin-top: 25px; text-align: right;">
            Cálculo Base Interno: ~${internalEstimate}€
          </p>
        </div>
      `,
    });

    // 4. CONFIRMACIÓN AL CLIENTE
    const subjects: any = { en: "Briefing Received", es: "Briefing Recibido", pl: "Briefing Otrzymany" };
    const texts: any = { 
      en: `Hi ${contact.fullName}, we have received your project details. We will contact you soon.`,
      es: `Hola ${contact.fullName}, hemos recibido los detalles de tu proyecto correctamente. Te contactaremos pronto.`,
      pl: `Cześć ${contact.fullName}, otrzymaliśmy szczegóły Twojego projektu. Wkrótce się skontaktujemy.`
    };

    await transporter.sendMail({
      from: `"The Smart Corner" <${fromEmail}>`,
      to: contact.email,
      subject: `${subjects[lang] || subjects.en} - The Smart Corner`,
      text: texts[lang] || texts.en,
    });

    return res.status(200).json({ success: true, aiSummary });
  } catch (error) {
    console.error("Mail Delivery Error:", error);
    return res.status(500).json({ error: 'Failed to send email. Check SMTP settings.' });
  }
}
