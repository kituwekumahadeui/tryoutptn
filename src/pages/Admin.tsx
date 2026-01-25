import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Search, Users, Download, Shield, LogOut, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import AdminPaymentVerification from '@/components/AdminPaymentVerification';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Participant {
  id: string;
  nama: string;
  nisn: string;
  tanggal_lahir: string;
  asal_sekolah: string;
  registered_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const TOTAL_SLOTS = 1000;

  // Check if user is already logged in and is admin
  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleError && roleData) {
          setIsAuthenticated(true);
          await fetchParticipants();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      // Use the public view that excludes password_hash
      const { data, error } = await supabase
        .from('participants_public')
        .select('*')
        .order('registered_at', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }

      setParticipants(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Email atau password salah');
        setIsLoggingIn(false);
        return;
      }

      if (!authData.user) {
        setError('Login gagal');
        setIsLoggingIn(false);
        return;
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        setError('Anda bukan admin. Akses ditolak.');
        await supabase.auth.signOut();
        setIsLoggingIn(false);
        return;
      }

      setIsAuthenticated(true);
      await fetchParticipants();
      toast.success('Login berhasil!');
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setParticipants([]);
    toast.success('Logout berhasil');
  };

  const filteredParticipants = participants.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nisn.includes(searchQuery) ||
      p.asal_sekolah.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const remainingSlots = TOTAL_SLOTS - participants.length;

  // CSV export - excludes sensitive data (password_hash is not in the view)
  const exportToCSV = () => {
    const headers = ['No', 'Nama', 'NISN', 'Tanggal Lahir', 'Asal Sekolah', 'Tanggal Daftar'];
    const rows = participants.map((p, index) => [
      index + 1,
      p.nama,
      p.nisn,
      p.tanggal_lahir ? new Date(p.tanggal_lahir).toLocaleDateString('id-ID') : '-',
      p.asal_sekolah,
      new Date(p.registered_at).toLocaleDateString('id-ID'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'daftar_peserta_tryout.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Panel Admin</CardTitle>
                <p className="text-muted-foreground">
                  Masuk dengan akun admin untuk mengakses panel
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Admin</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-destructive text-sm text-center">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      'Masuk Admin'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Panel Admin
            </h1>
            <p className="text-muted-foreground">
              Kelola dan pantau data peserta tryout
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pendaftar</p>
                  <p className="text-2xl font-bold text-foreground">
                    {participants.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sisa Kuota</p>
                  <p className="text-2xl font-bold text-foreground">
                    {remainingSlots}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <Users className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Kuota</p>
                  <p className="text-2xl font-bold text-foreground">
                    {TOTAL_SLOTS}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Participants and Payments */}
        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="participants">Daftar Peserta</TabsTrigger>
            <TabsTrigger value="payments">Verifikasi Pembayaran</TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="space-y-4">
            {/* Search and Export */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, NISN, atau asal sekolah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {/* Participants Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Daftar Peserta ({filteredParticipants.length} dari {participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">No</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>NISN</TableHead>
                        <TableHead>Tanggal Lahir</TableHead>
                        <TableHead>Asal Sekolah</TableHead>
                        <TableHead>Tanggal Daftar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParticipants.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            {searchQuery
                              ? 'Tidak ada peserta yang cocok dengan pencarian'
                              : 'Belum ada peserta yang mendaftar'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredParticipants.map((participant, index) => (
                          <TableRow key={participant.id}>
                            <TableCell className="font-medium">
                              {participants.indexOf(participant) + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {participant.nama}
                            </TableCell>
                            <TableCell className="font-mono">
                              {participant.nisn}
                            </TableCell>
                            <TableCell>
                              {participant.tanggal_lahir 
                                ? new Date(participant.tanggal_lahir).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })
                                : '-'}
                            </TableCell>
                            <TableCell>{participant.asal_sekolah}</TableCell>
                            <TableCell>
                              {new Date(participant.registered_at).toLocaleDateString(
                                'id-ID',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentVerification participants={participants.map(p => ({ id: p.id, nama: p.nama, nisn: p.nisn }))} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;