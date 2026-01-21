import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface OTPVerificationProps {
  email: string;
  nama: string;
  onVerified: () => void;
  onCancel: () => void;
}

const OTPVerification = ({ email, nama, onVerified, onCancel }: OTPVerificationProps) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Send OTP when component mounts
    sendOTP();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    if (countdown > 0) return;
    
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, nama },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Kode OTP telah dikirim!', {
          description: `Silakan cek email ${email}`,
        });
        setCountdown(60); // 60 second cooldown
      } else {
        toast.error(data.message || 'Gagal mengirim OTP');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error('Gagal mengirim OTP', {
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Masukkan 6 digit kode OTP');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { action: 'verify', email, otp },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Email berhasil diverifikasi!');
        onVerified();
      } else {
        toast.error(data?.message || 'OTP tidak valid');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error('Gagal memverifikasi OTP', {
        description: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Verifikasi Email</h3>
        <p className="text-sm text-muted-foreground">
          Masukkan kode 6 digit yang telah dikirim ke
        </p>
        <p className="text-sm font-medium text-primary">{email}</p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={verifyOTP}
          disabled={otp.length !== 6 || isVerifying}
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Memverifikasi...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Verifikasi
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Tidak menerima kode?</span>
          <Button
            variant="link"
            size="sm"
            onClick={sendOTP}
            disabled={countdown > 0 || isSending}
            className="p-0 h-auto gap-1"
          >
            {isSending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang'}
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full"
        >
          Kembali ke Form
        </Button>
      </div>
    </div>
  );
};

export default OTPVerification;
