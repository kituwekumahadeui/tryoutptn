import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Email wajib diisi');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email exists in database
      const { data: participant, error: checkError } = await supabase
        .from('participants')
        .select('id, nama')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (!participant) {
        setError('Email tidak terdaftar dalam sistem');
        setIsSubmitting(false);
        return;
      }

      // Call edge function to reset password
      const { data, error: resetError } = await supabase.functions.invoke('send-password', {
        body: { 
          email: email.toLowerCase(), 
          nama: participant.nama,
          action: 'reset',
          participantId: participant.id
        },
      });

      if (resetError) throw resetError;

      if (data?.success) {
        setIsSuccess(true);
        toast.success('Password baru telah dikirim!', {
          description: 'Silakan cek email Anda untuk password baru.',
        });
      } else {
        setError(data?.message || 'Gagal mengirim password baru');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Lupa Password
            </h1>
            <p className="text-muted-foreground">
              Masukkan email Anda untuk menerima password baru
            </p>
          </div>

          <Card className="animate-fade-in shadow-card" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Mail className="w-5 h-5 text-primary" />
                Reset Password
              </CardTitle>
              <CardDescription>
                Password baru akan dikirim ke email yang terdaftar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Password Baru Terkirim!</h3>
                  <p className="text-sm text-muted-foreground">
                    Silakan cek email <strong>{email}</strong> untuk password baru Anda.
                  </p>
                  <Button asChild className="w-full bg-gradient-primary hover:opacity-90 mt-4">
                    <Link to="/login">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Kembali ke Login
                    </Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Masukkan email terdaftar"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className={error ? 'border-destructive' : ''}
                    />
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Kirim Password Baru
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Link 
                      to="/login" 
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Kembali ke Login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
