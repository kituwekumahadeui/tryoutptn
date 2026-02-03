import { Link } from 'react-router-dom';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import SlotCounter from '@/components/SlotCounter';
import { ArrowRight, BookOpen, Clock, Trophy, Users } from 'lucide-react';
import logoGenza from '@/assets/logo-genza.png';
import logoUnigal from '@/assets/logo-unigal.png';

const Index = () => {
  const { remainingSlots, isLoggedIn } = useRegistration();
  const isFull = remainingSlots <= 0;

  const features = [
    {
      icon: BookOpen,
      title: 'Soal Berkualitas',
      description: 'Soal disusun oleh tim ahli sesuai standar UTBK',
    },
    {
      icon: Clock,
      title: 'Simulasi Waktu',
      description: 'Latihan dengan waktu sesuai ujian sesungguhnya',
    },
    {
      icon: Trophy,
      title: 'Analisis Hasil',
      description: 'Dapatkan analisis lengkap performa Anda',
    },
    {
      icon: Users,
      title: 'Kompetitif',
      description: 'Bandingkan skor dengan ribuan peserta lain',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            {/* Organizer Logos */}
            <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <img src={logoUnigal} alt="Universitas Galuh" className="h-12 object-contain" />
              </div>
               <span className="text-primary-foreground/60 text-2xl">×</span>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <img src={logoGenza} alt="Genza Education" className="h-10 object-contain" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              Pendaftaran Dibuka
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Tryout Ujian Masuk
              <br />
              <span className="bg-gradient-to-r from-secondary to-yellow-300 bg-clip-text text-transparent">
                Perguruan Tinggi
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Persiapkan diri Anda menghadapi UTBK dengan tryout yang komprehensif. 
              Kuota terbatas hanya untuk 1.000 peserta!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {isLoggedIn ? (
                <Link to="/dashboard">
                  <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold gap-2 animate-pulse-glow">
                    Lihat Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button 
                      size="lg" 
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold gap-2 animate-pulse-glow"
                      disabled={isFull}
                    >
                      {isFull ? 'Kuota Penuh' : 'Daftar Sekarang'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      Sudah Terdaftar? Masuk
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Slot Counter Section */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="max-w-xl mx-auto">
          <SlotCounter />
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            Kenapa Ikut Tryout Ini?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tryout yang dirancang khusus untuk membantu Anda meraih impian kuliah di PTN favorit
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="bg-card p-6 rounded-xl shadow-card border border-border hover:shadow-elevated transition-shadow animate-fade-in"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <div className="p-3 rounded-lg bg-accent w-fit mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
            Jangan Lewatkan Kesempatan Ini!
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Slot terbatas. Segera daftarkan diri Anda dan mulai persiapan menuju PTN impian.
          </p>
          {!isLoggedIn && !isFull && (
            <Link to="/register">
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold gap-2">
                Daftar Sekarang
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={logoUnigal} alt="Universitas Galuh" className="h-7 object-contain" />
            <span>×</span>            
            <img src={logoGenza} alt="Genza Education" className="h-6 object-contain" />
          </div>
          <p>&copy; 2026 Genza Education × Universitas Galuh. Platform simulasi ujian masuk perguruan tinggi.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;