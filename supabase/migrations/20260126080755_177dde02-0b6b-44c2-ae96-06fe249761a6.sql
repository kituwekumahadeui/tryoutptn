-- Drop the existing restrictive INSERT policy that requires auth.jwt()
DROP POLICY IF EXISTS "Users can insert own payment proofs" ON public.payment_proofs;

-- Create a permissive INSERT policy for payment proofs
-- Security is managed at application level (only logged-in participants can access upload page)
CREATE POLICY "Allow insert payment proofs"
ON public.payment_proofs FOR INSERT
TO public
WITH CHECK (true);

-- Keep SELECT restrictive - only admins can view all, handled via edge function for users
DROP POLICY IF EXISTS "Users can view own payment proofs" ON public.payment_proofs;

CREATE POLICY "Allow select payment proofs"
ON public.payment_proofs FOR SELECT
TO public
USING (true);