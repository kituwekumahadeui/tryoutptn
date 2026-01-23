import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, Clock, XCircle, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentUploadProps {
  participantId: string;
  onPaymentUploaded: () => void;
}

const PaymentUpload = ({ participantId, onPaymentUploaded }: PaymentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${participantId}-${Date.now()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Gagal mengupload bukti transfer');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      // Insert payment record
      const { error: insertError } = await supabase
        .from('payment_proofs')
        .insert({
          participant_id: participantId,
          file_path: urlData.publicUrl,
          amount: 10000,
          status: 'pending',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error('Gagal menyimpan data pembayaran');
        return;
      }

      toast.success('Bukti transfer berhasil diupload! Menunggu verifikasi admin.');
      onPaymentUploaded();
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      toast.error('Terjadi kesalahan saat upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="animate-fade-in border-amber-500/30 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <CreditCard className="w-5 h-5" />
          Pembayaran Pendaftaran
        </CardTitle>
        <CardDescription>
          Selesaikan pembayaran untuk mendapatkan kartu peserta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-foreground mb-2">Instruksi Pembayaran:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Transfer sebesar <span className="font-bold text-amber-700">Rp 10.000</span> ke rekening berikut:</li>
            <li className="ml-4">
              <div className="bg-amber-100 p-3 rounded-md mt-1">
                <p className="font-mono font-bold text-foreground">Bank BRI</p>
                <p className="font-mono text-lg text-amber-700">1234-5678-9012-3456</p>
                <p className="text-foreground">a.n. Panitia Tryout PTN</p>
              </div>
            </li>
            <li>Simpan bukti transfer (screenshot/foto)</li>
            <li>Upload bukti transfer di bawah ini</li>
          </ol>
        </div>

        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview bukti transfer"
                className="w-full max-h-64 object-contain rounded-lg border"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                Ganti
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 rounded-lg p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors"
            >
              <Upload className="w-10 h-10 mx-auto text-amber-500 mb-2" />
              <p className="text-sm text-muted-foreground">
                Klik untuk memilih bukti transfer
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Format: JPG, PNG (Maks. 5MB)
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Bukti Transfer
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface PaymentStatusProps {
  status: 'pending' | 'verified' | 'rejected';
  fileUrl?: string;
  adminNotes?: string;
}

export const PaymentStatus = ({ status, fileUrl, adminNotes }: PaymentStatusProps) => {
  const statusConfig = {
    pending: {
      icon: Clock,
      title: 'Menunggu Verifikasi',
      description: 'Bukti transfer sedang diperiksa oleh admin',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      iconColor: 'text-amber-500',
    },
    verified: {
      icon: CheckCircle2,
      title: 'Pembayaran Terverifikasi',
      description: 'Pembayaran Anda telah dikonfirmasi',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      iconColor: 'text-green-500',
    },
    rejected: {
      icon: XCircle,
      title: 'Pembayaran Ditolak',
      description: adminNotes || 'Bukti transfer tidak valid. Silakan upload ulang.',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      iconColor: 'text-red-500',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={`animate-fade-in ${config.bgColor} ${config.borderColor} border`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${config.bgColor}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{config.title}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        {fileUrl && (
          <div className="mt-4">
            <img
              src={fileUrl}
              alt="Bukti transfer"
              className="max-h-32 rounded-lg border object-contain"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentUpload;
