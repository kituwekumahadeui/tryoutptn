import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

// Hash password using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface SendPasswordRequest {
  email: string;
  nama: string;
  action?: 'reset';
  participantId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nama, action, participantId }: SendPasswordRequest = await req.json();
    
    console.log(`Generating and sending password to email: ${email}, action: ${action || 'new'}`);

    const password = generatePassword();

    // If this is a reset action, update the password in database
    if (action === 'reset' && participantId) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Konfigurasi database tidak lengkap.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const passwordHash = await hashPassword(password);

      const { error: updateError } = await supabase
        .from('participants')
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq('id', participantId);

      if (updateError) {
        console.error("Error updating password:", updateError);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Gagal mengupdate password di database.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      console.log(`Password updated for participant: ${participantId}`);
    }

    // Determine email content based on action
    const isReset = action === 'reset';
    const emailSubject = isReset 
      ? "Password Baru - Tryout PTN Genza × Unigal"
      : "Password Akun Tryout PTN - Genza × Unigal";
    
    const emailTitle = isReset ? "Password Baru" : "Password Akun";
    const emailGreeting = isReset 
      ? "Password akun Anda telah direset. Berikut adalah password baru untuk login:"
      : "Selamat! Email Anda telah berhasil diverifikasi. Berikut adalah password untuk login ke akun Tryout PTN Anda:";

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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 ${emailTitle}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Genza Education × Universitas Galuh</p>
          </div>
          <div class="content">
            <p class="greeting">Halo <strong>${nama}</strong>,</p>
            <p class="greeting">${emailGreeting}</p>
            <div class="password-box">
              <p class="password-code">${password}</p>
            </div>
            <div class="warning">
              <p>⚠️ <strong>PENTING:</strong> Simpan password ini dengan baik. ${isReset ? 'Password lama sudah tidak berlaku.' : 'Password tidak dapat dipulihkan jika hilang.'}</p>
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

    const emailResponse = await sendEmail(email, emailSubject, emailHtml);

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
        message: isReset ? "Password baru berhasil dikirim ke email." : "Password berhasil dikirim ke email.",
        password: isReset ? undefined : password // Only return password for new registrations
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