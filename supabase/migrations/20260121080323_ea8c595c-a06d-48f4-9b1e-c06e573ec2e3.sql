-- Explicitly deny any direct client access
CREATE POLICY "No direct select"
ON public.email_otps
FOR SELECT
USING (false);

CREATE POLICY "No direct insert"
ON public.email_otps
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update"
ON public.email_otps
FOR UPDATE
USING (false);

CREATE POLICY "No direct delete"
ON public.email_otps
FOR DELETE
USING (false);
