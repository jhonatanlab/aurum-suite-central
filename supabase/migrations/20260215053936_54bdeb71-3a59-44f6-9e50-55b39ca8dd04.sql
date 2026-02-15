
-- Allow all members of a company to see other members in the same company
CREATE POLICY "Members can view company members"
ON public.company_users
FOR SELECT
USING (user_belongs_to_company(company_id));

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Select own membership" ON public.company_users;

-- Allow owners to delete team members (remove from company)
CREATE POLICY "Owners can delete company members"
ON public.company_users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = company_users.company_id
      AND cu.role = 'owner'
  )
  AND company_users.user_id != auth.uid()
);
