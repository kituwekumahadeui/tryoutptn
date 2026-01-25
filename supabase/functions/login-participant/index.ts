import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hash password using SHA-256 with salt (same as registration)
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Legacy hash function (without salt) for backward compatibility
async function hashPasswordLegacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface LoginRequest {
  email: string;
  password: string;
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

    const { email, password }: LoginRequest = await req.json();
    
    console.log(`Login attempt for: ${email}`);

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email dan password harus diisi.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find participant by email (using service role to bypass RLS)
    const { data: participant, error: findError } = await supabase
      .from('participants')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (findError) {
      console.error("Error finding participant:", findError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Terjadi kesalahan saat login.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!participant) {
      // Generic error message to prevent email enumeration
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email atau password salah.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Check password - support both new salted format and legacy unsalted format
    const storedHash = participant.password_hash;
    let passwordMatches = false;

    if (storedHash.includes(':')) {
      // New format: salt:hash
      const [salt, hash] = storedHash.split(':');
      const inputHash = await hashPassword(password, salt);
      passwordMatches = inputHash === hash;
    } else {
      // Legacy format: unsalted hash
      const inputHash = await hashPasswordLegacy(password);
      passwordMatches = inputHash === storedHash;
    }

    if (!passwordMatches) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email atau password salah.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    console.log(`Login successful for: ${email}`);

    // Return user data WITHOUT password_hash
    const userData = {
      id: participant.id,
      nama: participant.nama,
      nisn: participant.nisn,
      tanggal_lahir: participant.tanggal_lahir,
      asal_sekolah: participant.asal_sekolah,
      whatsapp: participant.whatsapp,
      email: participant.email,
      registered_at: participant.registered_at,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Login berhasil.",
        user: userData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in login-participant function:", error);
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