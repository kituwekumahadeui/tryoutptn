-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can upload payment proof" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;

-- Create permissive policy for uploading payment proofs (allows anyone to upload)
CREATE POLICY "Allow public uploads to payment-proofs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-proofs');

-- Create policy for viewing (anyone can view their own uploads via signed URLs managed by app)
CREATE POLICY "Allow public read from payment-proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');