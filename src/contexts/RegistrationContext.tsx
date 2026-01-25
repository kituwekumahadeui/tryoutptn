import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  nama: string;
  nisn: string;
  tanggalLahir: string;
  asalSekolah: string;
  whatsapp: string;
  email: string;
  registeredAt: string;
}

interface RegistrationContextType {
  participants: Participant[];
  totalSlots: number;
  remainingSlots: number;
  currentUser: Participant | null;
  isLoggedIn: boolean;
  register: (data: Omit<Participant, 'id' | 'registeredAt'>, password: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshParticipants: () => Promise<void>;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

const TOTAL_SLOTS = 1000;
const USER_KEY = 'tryout-current-user';

// Simple hash function for password verification
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}


export const RegistrationProvider = ({ children }: { children: ReactNode }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);

  const refreshParticipants = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('registered_at', { ascending: true });

    if (!error && data) {
      const mapped = data.map(p => ({
        id: p.id,
        nama: p.nama,
        nisn: p.nisn,
        tanggalLahir: p.tanggal_lahir,
        asalSekolah: p.asal_sekolah,
        whatsapp: p.whatsapp,
        email: p.email,
        registeredAt: p.registered_at,
      }));
      setParticipants(mapped);
    }
  };

  useEffect(() => {
    refreshParticipants();
    const userStored = localStorage.getItem(USER_KEY);
    if (userStored) {
      setCurrentUser(JSON.parse(userStored));
    }
  }, []);

  const remainingSlots = TOTAL_SLOTS - participants.length;

  const register = async (data: Omit<Participant, 'id' | 'registeredAt'>, password: string): Promise<{ success: boolean; error?: string }> => {
    if (remainingSlots <= 0) {
      return { success: false, error: 'Kuota pendaftaran sudah penuh' };
    }

    // Check if email or NISN already exists
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .or(`email.eq.${data.email},nisn.eq.${data.nisn}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: 'Email atau NISN sudah terdaftar' };
    }

    // Hash the password from Edge Function
    const passwordHash = await hashPassword(password);

    // Insert into database
    const { error: insertError } = await supabase
      .from('participants')
      .insert({
        nama: data.nama,
        nisn: data.nisn,
        tanggal_lahir: data.tanggalLahir,
        asal_sekolah: data.asalSekolah,
        whatsapp: data.whatsapp,
        email: data.email.toLowerCase(),
        password_hash: passwordHash,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    // Refresh participants list
    await refreshParticipants();

    return { success: true };
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const passwordHash = await hashPassword(password);

    const { data: user, error } = await supabase
      .from('participants')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password_hash', passwordHash)
      .maybeSingle();

    if (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }

    if (!user) {
      return { success: false, error: 'Email atau password salah' };
    }

    const mappedUser: Participant = {
      id: user.id,
      nama: user.nama,
      nisn: user.nisn,
      tanggalLahir: user.tanggal_lahir,
      asalSekolah: user.asal_sekolah,
      whatsapp: user.whatsapp,
      email: user.email,
      registeredAt: user.registered_at,
    };

    setCurrentUser(mappedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <RegistrationContext.Provider
      value={{
        participants,
        totalSlots: TOTAL_SLOTS,
        remainingSlots,
        currentUser,
        isLoggedIn: !!currentUser,
        register,
        login,
        logout,
        refreshParticipants,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within RegistrationProvider');
  }
  return context;
};