import { useRegistration } from '@/contexts/RegistrationContext';
import { Users } from 'lucide-react';

const SlotCounter = () => {
  const { remainingSlots, totalSlots } = useRegistration();
  const filledPercentage = ((totalSlots - remainingSlots) / totalSlots) * 100;
  const isAlmostFull = remainingSlots <= 100;
  const isFull = remainingSlots <= 0;

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Sisa Kuota Pendaftaran</h3>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-4xl font-display font-bold animate-count-up ${
            isFull ? 'text-destructive' : isAlmostFull ? 'text-amber-500' : 'text-secondary'
          }`}>
            {remainingSlots.toLocaleString('id-ID')}
          </span>
          <span className="text-muted-foreground">/ {totalSlots.toLocaleString('id-ID')}</span>
        </div>
        
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              isFull ? 'bg-destructive' : isAlmostFull ? 'bg-amber-500' : 'bg-gradient-secondary'
            }`}
            style={{ width: `${filledPercentage}%` }}
          />
        </div>
      </div>

      {isFull ? (
        <p className="text-sm text-destructive font-medium">
          Kuota pendaftaran sudah penuh!
        </p>
      ) : isAlmostFull ? (
        <p className="text-sm text-amber-600 font-medium animate-pulse">
          ⚡ Kuota hampir habis! Segera daftar sekarang.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Masih tersedia slot untuk pendaftaran tryout.
        </p>
      )}
    </div>
  );
};

export default SlotCounter;
