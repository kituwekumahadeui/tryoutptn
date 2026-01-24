import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

type SendEmailResult =
  | { ok: true }
  | { ok: false; message: string };

async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return {
      ok: false,
      message: "GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi.",
    };
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    await client.send({
      from: GMAIL_USER,
      to: to,
      subject: subject,
      content: "Silakan aktifkan HTML untuk melihat email ini.",
      html: html,
    });

    await client.close();
    return { ok: true };
  } catch (error: any) {
    console.error("Gmail SMTP error:", error);
    return {
      ok: false,
      message: error.message || "Gagal mengirim email via Gmail.",
    };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate random password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

interface SendPasswordRequest {
  email: string;
  nama: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nama }: SendPasswordRequest = await req.json();
    
    console.log(`Generating and sending password to email: ${email}`);

    const password = generatePassword();

    // Send email with password
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
          .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .greeting { color: #374151; font-size: 16px; margin-bottom: 20px; }
          .password-box { background: #faf5ff; border: 2px solid #7c3aed; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .password-code { font-size: 28px; font-weight: bold; color: #7c3aed; letter-spacing: 4px; margin: 0; font-family: monospace; }
          .info { color: #6b7280; font-size: 14px; margin-top: 20px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .warning p { color: #92400e; margin: 0; font-size: 14px; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
          .logos { display: flex; justify-content: center; gap: 20px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Tryout PTN</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Genza Education × Universitas Galuh</p>
          </div>
          <div class="content">
            <p class="greeting">Halo <strong>${nama}</strong>,</p>
            <p class="greeting">Selamat! Email Anda telah berhasil diverifikasi. Berikut adalah password untuk login ke akun Tryout PTN Anda:</p>
            <div class="password-box">
              <p class="password-code">${password}</p>
            </div>
            <div class="warning">
              <p>⚠️ <strong>PENTING:</strong> Simpan password ini dengan baik. Password tidak dapat dipulihkan jika hilang.</p>
            </div>
            <p class="info">📧 Gunakan email <strong>${email}</strong> dan password di atas untuk masuk ke akun Anda.</p>
            <p class="info">🔐 Kami sarankan untuk menyimpan password ini di tempat yang aman.</p>
          </div>
          <div class="footer">
            <p>© 2026 Genza Education × Universitas Galuh</p>
            <p>Platform Tryout Ujian Masuk Perguruan Tinggi</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(
      email,
      "Password Akun Tryout PTN - Genza × Unigal",
      emailHtml,
    );

    console.log("Email send result:", emailResponse);

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Gagal mengirim email password: ${emailResponse.message}`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password berhasil dikirim ke email.",
        password: password // Return password so it can be used for registration
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in send-password function:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);