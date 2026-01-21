-- Drop permissive policy and use strict policy - only service role via edge function can access
DROP POLICY IF EXISTS "Service role can manage OTPs" ON public.email_otps;

-- No direct client access - edge function uses service role key which bypasses RLS
-- This table should only be accessed by the edge function