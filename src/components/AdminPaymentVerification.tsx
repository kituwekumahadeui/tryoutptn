import { useState, useEffect } from 'react';
import { Check, X, Loader2, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface PaymentProof {
  id: string;
  participant_id: string;
  file_path: string;
  amount: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  nama: string;
  nisn: string;
}

const AdminPaymentVerification = ({ participants }: { participants: Participant[] }) => {
  const [payments, setPayments] = useState<PaymentProof[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentProof | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        toast.error('Gagal memuat data pembayaran');
        return;
      }

      setPayments(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const getParticipantInfo = (participantId: string) => {
    return participants.find(p => p.id === participantId);
  };

  const handleVerify = async (status: 'verified' | 'rejected') => {
    if (!selectedPayment) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('payment_proofs')
        .update({
          status,
          admin_notes: adminNotes || null,
          verified_at: new Date().toISOString(),
          verified_by: 'admin',
        })
        .eq('id', selectedPayment.id);

      if (error) {
        console.error('Error updating payment:', error);
        toast.error('Gagal memperbarui status pembayaran');
        return;
      }

      toast.success(status === 'verified' ? 'Pembayaran berhasil diverifikasi!' : 'Pembayaran ditolak');
      setIsDialogOpen(false);
      setSelectedPayment(null);
      setAdminNotes('');
      fetchPayments();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openVerifyDialog = (payment: PaymentProof) => {
    setSelectedPayment(payment);
    setAdminNotes(payment.admin_notes || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">Menunggu</Badge>;
      case 'verified':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Terverifikasi</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const verifiedCount = payments.filter(p => p.status === 'verified').length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Verifikasi Pembayaran</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingCount} menunggu • {verifiedCount} terverifikasi
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPayments} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada bukti pembayaran yang diupload
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const participant = getParticipantInfo(payment.participant_id);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={payment.file_path}
                        alt="Bukti transfer"
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {participant?.nama || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          NISN: {participant?.nisn || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(payment.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openVerifyDialog(payment)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detail
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verifikasi Pembayaran</DialogTitle>
            <DialogDescription>
              Periksa bukti transfer dan verifikasi pembayaran peserta
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Peserta</p>
                  <p className="font-medium">
                    {getParticipantInfo(selectedPayment.participant_id)?.nama || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NISN</p>
                  <p className="font-mono">
                    {getParticipantInfo(selectedPayment.participant_id)?.nisn || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah</p>
                  <p className="font-medium">Rp {selectedPayment.amount.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Bukti Transfer</p>
                <img
                  src={selectedPayment.file_path}
                  alt="Bukti transfer"
                  className="w-full max-h-80 object-contain rounded-lg border bg-muted"
                />
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Catatan Admin (opsional)</p>
                <Textarea
                  placeholder="Tambahkan catatan jika diperlukan..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Tutup
            </Button>
            {selectedPayment?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleVerify('rejected')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                  Tolak
                </Button>
                <Button
                  onClick={() => handleVerify('verified')}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Verifikasi
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPaymentVerification;
