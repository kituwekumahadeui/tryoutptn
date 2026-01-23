-- Create payment_proofs table
CREATE TABLE public.payment_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for registration flow before auth)
CREATE POLICY "Anyone can insert payment proof"
ON public.payment_proofs
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view their own payment by participant_id
CREATE POLICY "Anyone can view payment proofs"
ON public.payment_proofs
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_proofs_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true);

-- Storage policies for payment proofs bucket
CREATE POLICY "Anyone can upload payment proof"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone can view payment proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-proofs');