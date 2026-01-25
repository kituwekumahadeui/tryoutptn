import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate random password with more characters for better security
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) { // 12 characters for security
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

    // Insert participant
    const { data: insertData, error: insertError } = await supabase
      .from('participants')
      .insert({
        nama,
        nisn,
        tanggal_lahir,
        asal_sekolah,
        whatsapp,
        email: email.toLowerCase(),
        password_hash: `${salt}:${passwordHash}`, // Store salt with hash
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

    // SECURITY: Password is NOT returned - it was already sent via email in the OTP verification flow
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Pendaftaran berhasil.",
        participantId: insertData.id,
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