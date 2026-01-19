import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Participant {
  id: string;
  nama: string;
  nisn: string;
  asalSekolah: string;
  registeredAt: string;
}

interface RegistrationContextType {
  participants: Participant[];
  totalSlots: number;
  remainingSlots: number;
  currentUser: Participant | null;
  isLoggedIn: boolean;
  register: (data: Omit<Participant, 'id' | 'registeredAt'>) => boolean;
  login: (nisn: string) => boolean;
  logout: () => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

const TOTAL_SLOTS = 1000;
const STORAGE_KEY = 'tryout-participants';
const USER_KEY = 'tryout-current-user';

export const RegistrationProvider = ({ children }: { children: ReactNode }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setParticipants(JSON.parse(stored));
    }
    const userStored = localStorage.getItem(USER_KEY);
    if (userStored) {
      setCurrentUser(JSON.parse(userStored));
    }
  }, []);

  const remainingSlots = TOTAL_SLOTS - participants.length;

  const register = (data: Omit<Participant, 'id' | 'registeredAt'>): boolean => {
    if (remainingSlots <= 0) return false;
    
    const exists = participants.some(p => p.nisn === data.nisn);
    if (exists) return false;

    const newParticipant: Participant = {
      ...data,
      id: crypto.randomUUID(),
      registeredAt: new Date().toISOString(),
    };

    const updated = [...participants, newParticipant];
    setParticipants(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    setCurrentUser(newParticipant);
    localStorage.setItem(USER_KEY, JSON.stringify(newParticipant));
    
    return true;
  };

  const login = (nisn: string): boolean => {
    const user = participants.find(p => p.nisn === nisn);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    }
    return false;
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
