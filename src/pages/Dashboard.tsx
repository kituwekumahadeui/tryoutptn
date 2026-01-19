import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import SlotCounter from '@/components/SlotCounter';
import { CheckCircle2, User, School, Hash, Calendar, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isLoggedIn, currentUser, participants } = useRegistration();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  if (!currentUser) return null;

  const registrationDate = new Date(currentUser.registeredAt);
  const registrationNumber = participants.findIndex(p => p.id === currentUser.id) + 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20 mb-4">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Pendaftaran Berhasil!
            </h1>
            <p className="text-muted-foreground">
              Selamat, Anda sudah terdaftar sebagai peserta tryout
            </p>
          </div>

          <Card className="animate-fade-in shadow-elevated border-secondary/30" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
              <CardTitle className="flex items-center gap-2 font-display">
                <Trophy className="w-5 h-5" />
                Kartu Peserta Tryout
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Simpan informasi ini untuk keperluan ujian
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 bg-accent/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Hash className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nomor Peserta</p>
                    <p className="text-2xl font-display font-bold text-foreground">
                      #{registrationNumber.toString().padStart(4, '0')}
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                      <p className="font-semibold text-foreground">{currentUser.nama}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Hash className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">NISN</p>
                      <p className="font-semibold text-foreground font-mono">{currentUser.nisn}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <School className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Asal Sekolah</p>
                      <p className="font-semibold text-foreground">{currentUser.asalSekolah}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tanggal Daftar</p>
                      <p className="font-semibold text-foreground">
                        {format(registrationDate, 'dd MMMM yyyy, HH:mm', { locale: id })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <SlotCounter />

          <Card className="animate-fade-in bg-accent/30 border-primary/20" style={{ animationDelay: '0.2s' }}>
            <CardContent className="pt-6">
              <h3 className="font-display font-semibold text-foreground mb-3">Informasi Penting</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Simpan nomor peserta Anda untuk keperluan ujian
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Jadwal dan lokasi ujian akan diinformasikan kemudian
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  Pastikan membawa kartu identitas saat ujian berlangsung
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
