import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SlotCounter from '@/components/SlotCounter';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const registerSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  nisn: z.string().length(10, 'NISN harus 10 digit').regex(/^\d+$/, 'NISN hanya boleh angka'),
  tanggalLahir: z.string().min(1, 'Tanggal lahir wajib diisi'),
  asalSekolah: z.string().min(3, 'Asal sekolah minimal 3 karakter').max(200, 'Asal sekolah maksimal 200 karakter'),
});

const Register = () => {
  const navigate = useNavigate();
  const { register, remainingSlots } = useRegistration();
  const [formData, setFormData] = useState({
    nama: '',
    nisn: '',
    tanggalLahir: '',
    asalSekolah: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const validated = registerSchema.parse(formData) as { nama: string; nisn: string; tanggalLahir: string; asalSekolah: string };
      
      if (remainingSlots <= 0) {
        toast.error('Maaf, kuota pendaftaran sudah penuh!');
        setIsSubmitting(false);
        return;
      }

      const success = register(validated);
      
      if (success) {
        toast.success('Pendaftaran berhasil!', {
          description: 'Selamat! Anda telah terdaftar untuk tryout.',
        });
        navigate('/dashboard');
      } else {
        toast.error('NISN sudah terdaftar', {
          description: 'Silakan masuk menggunakan NISN Anda.',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFull = remainingSlots <= 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Daftar Tryout PTN
            </h1>
            <p className="text-muted-foreground">
              Lengkapi data diri Anda untuk mendaftar tryout ujian masuk perguruan tinggi
            </p>
          </div>

          <SlotCounter />

          <Card className="animate-fade-in shadow-card" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <UserPlus className="w-5 h-5 text-primary" />
                Formulir Pendaftaran
              </CardTitle>
              <CardDescription>
                Pastikan data yang Anda masukkan sudah benar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFull ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Kuota Penuh</h3>
                  <p className="text-muted-foreground">
                    Maaf, kuota pendaftaran untuk tryout ini sudah habis.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="nama">Nama Lengkap</Label>
                    <Input
                      id="nama"
                      name="nama"
                      placeholder="Masukkan nama lengkap"
                      value={formData.nama}
                      onChange={handleChange}
                      className={errors.nama ? 'border-destructive' : ''}
                    />
                    {errors.nama && (
                      <p className="text-sm text-destructive">{errors.nama}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nisn">NISN (Nomor Induk Siswa Nasional)</Label>
                    <Input
                      id="nisn"
                      name="nisn"
                      placeholder="10 digit NISN"
                      value={formData.nisn}
                      onChange={handleChange}
                      maxLength={10}
                      className={errors.nisn ? 'border-destructive' : ''}
                    />
                    {errors.nisn && (
                      <p className="text-sm text-destructive">{errors.nisn}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tanggalLahir">Tanggal Lahir</Label>
                    <Input
                      id="tanggalLahir"
                      name="tanggalLahir"
                      type="date"
                      value={formData.tanggalLahir}
                      onChange={handleChange}
                      className={errors.tanggalLahir ? 'border-destructive' : ''}
                    />
                    {errors.tanggalLahir && (
                      <p className="text-sm text-destructive">{errors.tanggalLahir}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asalSekolah">Asal Sekolah</Label>
                    <Input
                      id="asalSekolah"
                      name="asalSekolah"
                      placeholder="Nama sekolah asal"
                      value={formData.asalSekolah}
                      onChange={handleChange}
                      className={errors.asalSekolah ? 'border-destructive' : ''}
                    />
                    {errors.asalSekolah && (
                      <p className="text-sm text-destructive">{errors.asalSekolah}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      'Mendaftar...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Daftar Sekarang
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Register;
