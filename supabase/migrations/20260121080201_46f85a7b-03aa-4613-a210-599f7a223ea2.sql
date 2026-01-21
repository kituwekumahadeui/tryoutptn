-- Allow edge function with service role to manage OTPs
CREATE POLICY "Service role can manage OTPs"
ON public.email_otps
FOR ALL
USING (true)
WITH CHECK (true);