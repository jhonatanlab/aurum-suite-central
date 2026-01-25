-- Allow superadmins to view all companies
CREATE POLICY "Superadmins can view all companies"
ON public.companies
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));