import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
  status: string | null;
  stock: number | null;
}

export function useProducts() {
  const { company } = useCompany();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, category, status, stock")
        .eq("company_id", company.id)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!company?.id,
  });

  const getProductById = (id: string | null) => {
    if (!id) return null;
    return products.find((p) => p.id === id) || null;
  };

  return {
    products,
    isLoading,
    getProductById,
  };
}
