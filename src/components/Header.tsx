import { Link, useNavigate } from 'react-router-dom';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import logoGenza from '@/assets/logo-genza.png';
import logoUnigal from '@/assets/logo-unigal.png';

const Header = () => {
  const { isLoggedIn, currentUser, logout } = useRegistration();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex items-center gap-2">
            <img src={logoGenza} alt="Genza Education" className="h-8 object-contain" />
            <span className="text-muted-foreground font-medium">×</span>
            <img src={logoUnigal} alt="Universitas Galuh" className="h-10 object-contain" />
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  {currentUser?.nama.split(' ')[0]}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Keluar
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Masuk</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-primary hover:opacity-90 transition-opacity">
                  Daftar Sekarang
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;