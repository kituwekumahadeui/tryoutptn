import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Search, Users, Download, Shield } from 'lucide-react';
import { useRegistration } from '@/contexts/RegistrationContext';
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

const Admin = () => {
  const { participants, totalSlots, remainingSlots } = useRegistration();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  const ADMIN_PASSWORD = 'admin123'; // Simple password for demo

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Password salah!');
    }
  };

  const filteredParticipants = participants.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nisn.includes(searchQuery) ||
      p.asalSekolah.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['No', 'Nama', 'NISN', 'Tanggal Lahir', 'Asal Sekolah', 'Tanggal Daftar'];
    const rows = participants.map((p, index) => [
      index + 1,
      p.nama,
      p.nisn,
      p.tanggalLahir ? new Date(p.tanggalLahir).toLocaleDateString('id-ID') : '-',
      p.asalSekolah,
      new Date(p.registeredAt).toLocaleDateString('id-ID'),
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
                  Masukkan password untuk mengakses panel admin
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <Input
                      type="password"
                      placeholder="Password Admin"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="text-center"
                    />
                  </div>
                  {error && (
                    <p className="text-destructive text-sm text-center">{error}</p>
                  )}
                  <Button type="submit" className="w-full">
                    Masuk Admin
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Panel Admin
          </h1>
          <p className="text-muted-foreground">
            Kelola dan pantau data peserta tryout
          </p>
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
                    {totalSlots}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Export */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                          {participant.tanggalLahir 
                            ? new Date(participant.tanggalLahir).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>{participant.asalSekolah}</TableCell>
                        <TableCell>
                          {new Date(participant.registeredAt).toLocaleDateString(
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
      </main>
    </div>
  );
};

export default Admin;
