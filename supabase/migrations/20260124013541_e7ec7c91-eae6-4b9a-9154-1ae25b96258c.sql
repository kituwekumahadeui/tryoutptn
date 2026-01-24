-- Add UPDATE policy for payment proofs (allows admin verification)
CREATE POLICY "Anyone can update payment proofs"
ON public.payment_proofs
FOR UPDATE
USING (true)
WITH CHECK (true);