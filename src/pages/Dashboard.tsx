import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import SlotCounter from '@/components/SlotCounter';
import PaymentUpload, { PaymentStatus } from '@/components/PaymentUpload';
import { CheckCircle2, User, School, Hash, Calendar, Trophy, Download, Cake } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentProof {
  id: string;
  status: 'pending' | 'verified' | 'rejected';
  file_path: string;
  admin_notes: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { isLoggedIn, currentUser, participants } = useRegistration();
  const cardRef = useRef<HTMLDivElement>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentProof | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      if (!currentUser?.id) return;

      try {
        const { data, error } = await supabase
          .from('payment_proofs')
          .select('id, status, file_path, admin_notes')
          .eq('participant_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching payment status:', error);
          return;
        }

        setPaymentStatus(data as PaymentProof | null);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoadingPayment(false);
      }
    };

    fetchPaymentStatus();
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const registrationDate = new Date(currentUser.registeredAt);
  const registrationNumber = participants.findIndex(p => p.id === currentUser.id) + 1;
  const birthDate = currentUser.tanggalLahir ? new Date(currentUser.tanggalLahir) : null;

  const downloadCard = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `kartu-peserta-${currentUser.nisn}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Kartu peserta berhasil diunduh!');
    } catch (error) {
      console.error('Error downloading card:', error);
      toast.error('Gagal mengunduh kartu peserta');
    }
  };

  const handlePaymentUploaded = () => {
    setPaymentStatus({
      id: '',
      status: 'pending',
      file_path: '',
      admin_notes: null,
    });
  };

  const isPaymentVerified = paymentStatus?.status === 'verified';

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

          {/* Payment Section */}
          {!isLoadingPayment && !isPaymentVerified && (
            <>
              {!paymentStatus ? (
                <PaymentUpload 
                  participantId={currentUser.id} 
                  onPaymentUploaded={handlePaymentUploaded} 
                />
              ) : paymentStatus.status === 'rejected' ? (
                <>
                  <PaymentStatus 
                    status="rejected" 
                    fileUrl={paymentStatus.file_path}
                    adminNotes={paymentStatus.admin_notes || undefined}
                  />
                  <PaymentUpload 
                    participantId={currentUser.id} 
                    onPaymentUploaded={handlePaymentUploaded} 
                  />
                </>
              ) : (
                <PaymentStatus 
                  status={paymentStatus.status} 
                  fileUrl={paymentStatus.file_path}
                />
              )}
            </>
          )}

          {/* Participant Card - Only show when payment is verified */}
          {isPaymentVerified && (
            <Card className="animate-fade-in shadow-elevated border-secondary/30" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Trophy className="w-5 h-5" />
                    Kartu Peserta Tryout
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    Simpan informasi ini untuk keperluan ujian
                  </CardDescription>
                </div>
                <Button 
                  onClick={downloadCard}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Unduh Kartu
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div ref={cardRef} className="bg-white p-6 rounded-lg">
                  <div className="text-center mb-4 pb-4 border-b border-muted">
                    <h2 className="text-xl font-display font-bold text-primary">KARTU PESERTA TRYOUT PTN</h2>
                    <p className="text-sm text-muted-foreground">Ujian Masuk Perguruan Tinggi Negeri</p>
                  </div>
                  
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
                          <Cake className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tanggal Lahir</p>
                          <p className="font-semibold text-foreground">
                            {birthDate ? format(birthDate, 'dd MMMM yyyy', { locale: id }) : '-'}
                          </p>
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

                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg sm:col-span-2">
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
                </div>
              </CardContent>
            </Card>
          )}

          <SlotCounter />

          <Card className="animate-fade-in bg-accent/30 border-primary/20" style={{ animationDelay: '0.2s' }}>
            <CardContent className="pt-6">
              <h3 className="font-display font-semibold text-foreground mb-3">Informasi Penting</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {!isPaymentVerified && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                    Lakukan pembayaran Rp 10.000 untuk mendapatkan kartu peserta
                  </li>
                )}
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
