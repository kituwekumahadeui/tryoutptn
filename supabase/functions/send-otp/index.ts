import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Tryout PTN <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type SendEmailResult =
  | { ok: true; status: number; data: any }
  | { ok: false; status: number; data: any; message: string };

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    return {
      ok: false,
      status: 500,
      data: null,
      message: "RESEND_API_KEY belum dikonfigurasi.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const text = await response.text();
  const json = safeJsonParse(text);
  const resendMessage =
    json?.message ?? json?.error?.message ?? "Gagal mengirim email.";
  const resendStatusCode = typeof json?.statusCode === "number" ? json.statusCode : null;

  if (!response.ok || (resendStatusCode !== null && resendStatusCode >= 400)) {
    return {
      ok: false,
      status: response.status,
      data: json,
      message: String(resendMessage),
    };
  }

  return { ok: true, status: response.status, data: json };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash function for OTP (not cryptographic, but sufficient for short-lived OTPs)
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + SUPABASE_SERVICE_ROLE_KEY);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface SendOTPRequest {
  email: string;
  nama: string;
}

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const queryAction = url.searchParams.get("action");
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = (body?.action ?? queryAction) as string | null;

    if (action === "verify") {
      // Verify OTP
      const { email, otp }: VerifyOTPRequest = body;
      
      console.log(`Verifying OTP for email: ${email}`);
      
      // Get stored OTP from database
      const { data: stored, error: fetchError } = await supabase
        .from("email_otps")
        .select("otp_hash, expires_at")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching OTP:", fetchError);
        throw fetchError;
      }
      
      if (!stored) {
        return new Response(
          JSON.stringify({ success: false, message: "OTP tidak ditemukan. Silakan minta OTP baru." }),
          {
            // Return 200 so frontend callers using supabase.functions.invoke don't treat this as a runtime error
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (new Date() > new Date(stored.expires_at)) {
        // Delete expired OTP
        await supabase.from("email_otps").delete().eq("email", email.toLowerCase());
        return new Response(
          JSON.stringify({ success: false, message: "OTP sudah kadaluarsa. Silakan minta OTP baru." }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Verify OTP hash
      const inputHash = await hashOTP(otp);
      if (stored.otp_hash !== inputHash) {
        return new Response(
          JSON.stringify({ success: false, message: "OTP tidak valid." }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // OTP valid, remove it
      await supabase.from("email_otps").delete().eq("email", email.toLowerCase());
      console.log(`OTP verified successfully for email: ${email}`);

      return new Response(
        JSON.stringify({ success: true, message: "Email berhasil diverifikasi!" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // Send OTP
      const { email, nama }: SendOTPRequest = body;
      
      console.log(`Sending OTP to email: ${email}`);

      const otp = generateOTP();
      const otpHash = await hashOTP(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      // Store OTP in database (upsert to handle resend)
      const { error: upsertError } = await supabase
        .from("email_otps")
        .upsert({
          email: email.toLowerCase(),
          otp_hash: otpHash,
          expires_at: expiresAt,
        }, { onConflict: "email" });

      if (upsertError) {
        console.error("Error storing OTP:", upsertError);
        throw upsertError;
      }

      // Send email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
            .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .greeting { color: #374151; font-size: 16px; margin-bottom: 20px; }
            .otp-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; margin: 0; }
            .info { color: #6b7280; font-size: 14px; margin-top: 20px; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Tryout PTN</h1>
            </div>
            <div class="content">
              <p class="greeting">Halo <strong>${nama}</strong>,</p>
              <p class="greeting">Berikut adalah kode verifikasi untuk pendaftaran Tryout PTN:</p>
              <div class="otp-box">
                <p class="otp-code">${otp}</p>
              </div>
              <p class="info">⏰ Kode ini berlaku selama 5 menit.</p>
              <p class="info">⚠️ Jangan bagikan kode ini kepada siapapun.</p>
            </div>
            <div class="footer">
              <p>© 2024 Tryout PTN. Semoga sukses!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailResponse = await sendEmail(
        email,
        "Kode Verifikasi Pendaftaran Tryout PTN",
        emailHtml,
      );

      console.log("Email send result:", emailResponse);

      if (!emailResponse.ok) {
        // Rollback OTP if email couldn't be sent (prevents confusing "OTP terkirim" but user receives nothing)
        await supabase.from("email_otps").delete().eq("email", email.toLowerCase());

        return new Response(
          JSON.stringify({
            success: false,
            message: `Gagal mengirim email OTP: ${emailResponse.message}`,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "OTP berhasil dikirim ke email Anda." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
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
