import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSuperAdminRole() {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'superadmin')
          .maybeSingle();

        if (error) {
          console.error('Error checking superadmin role:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!data);
        }
      } catch (err) {
        console.error('Error checking superadmin role:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkSuperAdminRole();
    }
  }, [user, authLoading]);

  return { isSuperAdmin, loading: authLoading || loading, user };
}
