-- =====================================================
-- SECURITY FIX: Proper Role-Based Access Control
-- =====================================================

-- 1. Create app_role enum for role management
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table for admin management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- 5. RLS policies for user_roles (only admins can manage roles)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SECURITY FIX: Create public view for participants (hide password_hash)
-- =====================================================

-- 6. Create a public view that excludes sensitive fields
CREATE VIEW public.participants_public
WITH (security_invoker=on) AS
SELECT 
    id, 
    nama, 
    nisn, 
    tanggal_lahir, 
    asal_sekolah, 
    whatsapp,
    email,
    registered_at, 
    updated_at
FROM public.participants;

-- Grant access to the view
GRANT SELECT ON public.participants_public TO anon, authenticated;

-- =====================================================
-- SECURITY FIX: Update participants RLS policies
-- =====================================================

-- 7. Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can select participants" ON public.participants;

-- 8. Create restrictive SELECT policy - deny direct access (use view instead)
CREATE POLICY "No direct select on participants"
ON public.participants FOR SELECT
USING (false);

-- 9. Keep INSERT policy but make it more restrictive (only for authenticated or anon with email verification)
-- We keep the existing insert policy as users need to register

-- =====================================================
-- SECURITY FIX: Update payment_proofs RLS policies
-- =====================================================

-- 10. Drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Anyone can update payment proofs" ON public.payment_proofs;

-- 11. Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON public.payment_proofs;

-- 12. Drop overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert payment proof" ON public.payment_proofs;

-- 13. Create proper policies for payment_proofs
-- Authenticated users can only view their own payment proofs
CREATE POLICY "Users can view own payment proofs"
ON public.payment_proofs FOR SELECT
TO authenticated
USING (participant_id IN (
    SELECT id FROM public.participants WHERE email = auth.jwt()->>'email'
) OR public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert their own payment proofs
CREATE POLICY "Users can insert own payment proofs"
ON public.payment_proofs FOR INSERT
TO authenticated
WITH CHECK (participant_id IN (
    SELECT id FROM public.participants WHERE email = auth.jwt()->>'email'
));

-- Only admins can update payment verification
CREATE POLICY "Admins can update payment proofs"
ON public.payment_proofs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SECURITY FIX: Make storage bucket private
-- =====================================================

-- 14. Update storage bucket to be private
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';

-- 15. Drop public storage policy
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;

-- 16. Create authenticated-only storage policies
CREATE POLICY "Authenticated users can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Keep existing upload policy but make it authenticated-only
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;

CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');