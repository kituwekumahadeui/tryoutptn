import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { LogIn, KeyRound } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useRegistration();
  const [nisn, setNisn] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (nisn.length !== 10 || !/^\d+$/.test(nisn)) {
      setError('NISN harus 10 digit angka');
      setIsSubmitting(false);
      return;
    }

    const success = login(nisn);
    
    if (success) {
      toast.success('Berhasil masuk!');
      navigate('/dashboard');
    } else {
      setError('NISN tidak ditemukan. Pastikan Anda sudah terdaftar.');
      toast.error('NISN tidak ditemukan');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Masuk
            </h1>
            <p className="text-muted-foreground">
              Masuk menggunakan NISN Anda
            </p>
          </div>

          <Card className="animate-fade-in shadow-card" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <KeyRound className="w-5 h-5 text-primary" />
                Login Peserta
              </CardTitle>
              <CardDescription>
                Masukkan NISN yang terdaftar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="nisn">NISN</Label>
                  <Input
                    id="nisn"
                    placeholder="Masukkan 10 digit NISN"
                    value={nisn}
                    onChange={(e) => {
                      setNisn(e.target.value);
                      setError('');
                    }}
                    maxLength={10}
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
                    'Memproses...'
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Masuk
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum terdaftar?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Daftar sekarang
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
