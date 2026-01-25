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
  registerFromEdgeFunction: (data: Omit<Participant, 'id' | 'registeredAt'>) => Promise<{ success: boolean; error?: string }>;
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
    // Use the public view that excludes password_hash
    const { data, error } = await supabase
      .from('participants_public')
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

  // Registration is now handled by edge function - password is sent via email only
  const registerFromEdgeFunction = async (data: Omit<Participant, 'id' | 'registeredAt'>): Promise<{ success: boolean; error?: string }> => {
    if (remainingSlots <= 0) {
      return { success: false, error: 'Kuota pendaftaran sudah penuh' };
    }

    try {
      // Call edge function to handle registration securely
      const { data: registerData, error: registerError } = await supabase.functions.invoke('register-participant', {
        body: {
          nama: data.nama,
          nisn: data.nisn,
          tanggal_lahir: data.tanggalLahir,
          asal_sekolah: data.asalSekolah,
          whatsapp: data.whatsapp,
          email: data.email.toLowerCase(),
        },
      });

      if (registerError) {
        console.error('Registration error:', registerError);
        return { success: false, error: registerError.message };
      }

      if (!registerData?.success) {
        return { success: false, error: registerData?.message || 'Gagal mendaftar' };
      }

      // Refresh participants list
      await refreshParticipants();

      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call edge function for secure login (password verification happens server-side)
      const { data: loginData, error: loginError } = await supabase.functions.invoke('login-participant', {
        body: { email: email.toLowerCase(), password },
      });

      if (loginError) {
        console.error('Login error:', loginError);
        return { success: false, error: 'Terjadi kesalahan saat login' };
      }

      if (!loginData?.success) {
        return { success: false, error: loginData?.message || 'Email atau password salah' };
      }

      const user = loginData.user;
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
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }
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
        registerFromEdgeFunction,
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