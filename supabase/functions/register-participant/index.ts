import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate random password with more characters for better security
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate a random salt
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash password using SHA-256 with salt
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

interface RegisterRequest {
  nama: string;
  nisn: string;
  tanggal_lahir: string;
  asal_sekolah: string;
  whatsapp: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { nama, nisn, tanggal_lahir, asal_sekolah, whatsapp, email }: RegisterRequest = await req.json();
    
    console.log(`Registering participant: ${email}`);

    // Validate input
    if (!nama || !nisn || !tanggal_lahir || !asal_sekolah || !whatsapp || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Semua field harus diisi.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Validate NISN format (10 digits)
    if (!/^\d{10}$/.test(nisn)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "NISN harus 10 digit angka.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Format email tidak valid.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if email or NISN already exists
    const { data: existing, error: checkError } = await supabase
      .from('participants')
      .select('id')
      .or(`email.eq.${email.toLowerCase()},nisn.eq.${nisn}`)
      .limit(1);

    if (checkError) {
      console.error("Error checking existing:", checkError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Gagal memeriksa data.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email atau NISN sudah terdaftar.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Generate password and salt
    const password = generatePassword();
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    console.log(`Generated password for: ${email}`);

    // Insert participant with the password hash
    const { data: insertData, error: insertError } = await supabase
      .from('participants')
      .insert({
        nama,
        nisn,
        tanggal_lahir,
        asal_sekolah,
        whatsapp,
        email: email.toLowerCase(),
        password_hash: `${salt}:${passwordHash}`,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          message: insertError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    console.log(`Participant registered: ${insertData.id}`);

    // Send password via email
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
            <h1>🎓 Password Akun</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Genza Education × Universitas Galuh</p>
          </div>
          <div class="content">
            <p class="greeting">Halo <strong>${nama}</strong>,</p>
            <p class="greeting">Pendaftaran Anda berhasil! Berikut adalah password untuk login ke akun Tryout PTN Anda:</p>
            <div class="password-box">
              <p class="password-code">${password}</p>
            </div>
            <div class="warning">
              <p>⚠️ <strong>PENTING:</strong> Simpan password ini dengan baik. Password dapat direset melalui fitur "Lupa Password" jika diperlukan.</p>
            </div>
            <p class="info">📧 Gunakan email <strong>${email.toLowerCase()}</strong> dan password di atas untuk masuk ke akun Anda.</p>
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

    const emailResult = await sendEmail(email.toLowerCase(), "Password Akun Tryout PTN - Genza × Unigal", emailHtml);
    
    console.log(`Email send result:`, emailResult);

    if (!emailResult.ok) {
      console.error("Failed to send password email:", emailResult.message);
      // Still return success since registration is complete, but warn about email
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Pendaftaran berhasil, namun gagal mengirim email password. Silakan gunakan fitur Lupa Password untuk mendapatkan password.",
          participantId: insertData.id,
          emailSent: false,
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
        message: "Pendaftaran berhasil. Password telah dikirim ke email Anda.",
        participantId: insertData.id,
        emailSent: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in register-participant function:", error);
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
