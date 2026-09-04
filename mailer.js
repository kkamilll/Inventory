const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Read SMTP configuration from environment variables
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

const fromEmail = process.env.SMTP_FROM || 'no-reply@firma.pl';

// Check if SMTP settings are fully configured
const isSmtpConfigured = !!(smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass);

let transporter = null;

if (isSmtpConfigured) {
  console.log(`[MAILER] SMTP host detected (${smtpConfig.host}). Initializing mail transport...`);
  transporter = nodemailer.createTransport(smtpConfig);
  // Verify configuration connection
  transporter.verify((error, success) => {
    if (error) {
      console.warn(`[WARNING] MAILER: SMTP verification failed: ${error.message}. Fallback to dev console/file will be used if sending fails.`);
    } else {
      console.log('[MAILER] SMTP connection successfully verified.');
    }
  });
} else {
  console.log('[Mailer] SMTP not configured. Password reset codes will be logged to console and last_sent_email.txt');
}

/**
 * Sends a password reset code email.
 * @param {string} toEmail Recipient email address
 * @param {string} code 6-digit OTP code
 * @returns {Promise<boolean>}
 */
async function sendResetCodeEmail(toEmail, code) {
  const subject = 'IT Lease Hub — Resetowanie hasła do konta';
  
  // HTML body in premium dark mode glassmorphic style
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <title>${subject}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #0b0f19;
          color: #f3f4f6;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 30px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #ffffff;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 15px;
          color: #d1d5db;
        }
        .code-box {
          background: rgba(99, 102, 241, 0.1);
          border: 2px dashed rgba(99, 102, 241, 0.4);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .code-val {
          font-family: "Courier New", Courier, monospace;
          font-size: 36px;
          font-weight: 800;
          color: #818cf8;
          letter-spacing: 6px;
          margin: 0;
        }
        .footer {
          background-color: rgba(0, 0, 0, 0.2);
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 12px;
          color: #6b7280;
        }
        .footer a {
          color: #818cf8;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>IT Lease Hub</h1>
        </div>
        <div class="content">
          <p>Dzień dobry,</p>
          <p>Otrzymaliśmy zgłoszenie dotyczące zresetowania hasła do Twojego konta w systemie inwentaryzacji <strong>IT Lease Hub</strong>.</p>
          <p>Twój jednorazowy, 6-cyfrowy kod weryfikacyjny to:</p>
          
          <div class="code-box">
            <div class="code-val">${code}</div>
          </div>
          
          <p>Kod ten jest ważny przez <strong>15 minut</strong>. Jeżeli to nie Ty wysyłałeś zgłoszenie o zresetowanie hasła, zignoruj tę wiadomość.</p>
          <p>Z poważaniem,<br>Dział IT Firma Sp. z o.o.</p>
        </div>
        <div class="footer">
          Wiadomość wygenerowana automatycznie przez system IT Lease Hub.<br>
          Wszystkie prawa zastrzeżone &copy; 2026.
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `Dzień dobry,\n\nOtrzymaliśmy zgłoszenie dotyczące zresetowania hasła do Twojego konta w systemie IT Lease Hub.\n\nTwój jednorazowy kod resetujący to: ${code}\n\nKod jest ważny przez 15 minut.\n\nZ poważaniem,\nDział IT`;

  // Always write locally for audit / dev ease
  const localLogPath = path.join(__dirname, 'last_sent_email.txt');
  const fileContent = `========================================================================
DATA: ${new Date().toLocaleString()}
DO: ${toEmail}
TEMAT: ${subject}
KOD: ${code}
========================================================================
TREŚĆ:
${textBody}
========================================================================`;
  
  try {
    fs.writeFileSync(localLogPath, fileContent, 'utf8');
  } catch (fsErr) {
    console.error('Error writing email backup to last_sent_email.txt:', fsErr);
  }

  // Attempt real SMTP if configured
  if (isSmtpConfigured && transporter) {
    try {
      await transporter.sendMail({
        from: `IT Lease Hub <${fromEmail}>`,
        to: toEmail,
        subject: subject,
        text: textBody,
        html: htmlBody
      });
      console.log(`[MAILER] Reset e-mail successfully sent to: ${toEmail}`);
      return true;
    } catch (smtpErr) {
      console.error(`[ERROR] MAILER: SMTP sending failed: ${smtpErr.message}. Falling back to console logging.`);
    }
  }

  // Dev mode log
  console.log(`[Mailer Dev Mode] Reset code for ${toEmail}: ${code} (saved to last_sent_email.txt)`);

  return true;
}

module.exports = {
  sendResetCodeEmail
};
