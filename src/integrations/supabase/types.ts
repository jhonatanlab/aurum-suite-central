export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          message: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string | null
          crm_settings: Json | null
          id: string
          name: string
          owner_uid: string | null
          payment_settings: Json | null
          plan: string | null
          status: string | null
          updated_at: string | null
          whatsapp_settings: Json | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          crm_settings?: Json | null
          id?: string
          name: string
          owner_uid?: string | null
          payment_settings?: Json | null
          plan?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_settings?: Json | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          crm_settings?: Json | null
          id?: string
          name?: string
          owner_uid?: string | null
          payment_settings?: Json | null
          plan?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_settings?: Json | null
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_closings: {
        Row: {
          closed_at: string
          closed_by: string | null
          commission_type: string
          commission_value: number
          company_id: string
          created_at: string
          id: string
          net_profit: number
          observation: string | null
          period_end: string
          period_start: string
          reseller_id: string
          total_commission: number
          total_items: number
          total_pending: number
          total_returned: number
          total_sold: number
          total_sold_value: number
        }
        Insert: {
          closed_at?: string
          closed_by?: string | null
          commission_type?: string
          commission_value?: number
          company_id: string
          created_at?: string
          id?: string
          net_profit?: number
          observation?: string | null
          period_end: string
          period_start: string
          reseller_id: string
          total_commission?: number
          total_items?: number
          total_pending?: number
          total_returned?: number
          total_sold?: number
          total_sold_value?: number
        }
        Update: {
          closed_at?: string
          closed_by?: string | null
          commission_type?: string
          commission_value?: number
          company_id?: string
          created_at?: string
          id?: string
          net_profit?: number
          observation?: string | null
          period_end?: string
          period_start?: string
          reseller_id?: string
          total_commission?: number
          total_items?: number
          total_pending?: number
          total_returned?: number
          total_sold?: number
          total_sold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "consignment_closings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_closings_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_items: {
        Row: {
          closing_id: string | null
          commission_amount: number | null
          company_id: string
          consignment_value: number
          created_at: string
          id: string
          observation: string | null
          product_id: string
          reseller_id: string
          returned_at: string | null
          returned_by: string | null
          sale_value: number | null
          sent_at: string
          sold_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          closing_id?: string | null
          commission_amount?: number | null
          company_id: string
          consignment_value: number
          created_at?: string
          id?: string
          observation?: string | null
          product_id: string
          reseller_id: string
          returned_at?: string | null
          returned_by?: string | null
          sale_value?: number | null
          sent_at?: string
          sold_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          closing_id?: string | null
          commission_amount?: number | null
          company_id?: string
          consignment_value?: number
          created_at?: string
          id?: string
          observation?: string | null
          product_id?: string
          reseller_id?: string
          returned_at?: string | null
          returned_by?: string | null
          sale_value?: number | null
          sent_at?: string
          sold_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_items_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "consignment_closings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_items_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_history: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          lead_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          lead_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          lead_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          position: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          date: string
          description: string
          id: string
          method: string | null
          origin: string | null
          paid_at: string | null
          receipt_path: string | null
          reference_id: string | null
          status: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          date: string
          description: string
          id?: string
          method?: string | null
          origin?: string | null
          paid_at?: string | null
          receipt_path?: string | null
          reference_id?: string | null
          status: string
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          method?: string | null
          origin?: string | null
          paid_at?: string | null
          receipt_path?: string | null
          reference_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string
          created_at: string | null
          email: string | null
          history: Json | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          product_id: string | null
          product_value: number | null
          source: string | null
          status: string | null
          tags: string[] | null
          value: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email?: string | null
          history?: Json | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          product_value?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          value?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string | null
          history?: Json | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          product_value?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          installment_rules: Json
          name: string
          service_fee_percent: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          installment_rules?: Json
          name: string
          service_fee_percent?: number
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          installment_rules?: Json
          name?: string
          service_fee_percent?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateways_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batches: {
        Row: {
          batch_code: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          observation: string | null
          product_id: string
          quantity: number
          status: string
          supplier_id: string | null
        }
        Insert: {
          batch_code: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          observation?: string | null
          product_id: string
          quantity?: number
          status?: string
          supplier_id?: string | null
        }
        Update: {
          batch_code?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          observation?: string | null
          product_id?: string
          quantity?: number
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          company_id: string
          consignment_available: boolean | null
          created_at: string | null
          id: string
          minimum_stock: number | null
          name: string
          price: number
          status: string | null
          stock: number | null
        }
        Insert: {
          category?: string | null
          company_id: string
          consignment_available?: boolean | null
          created_at?: string | null
          id?: string
          minimum_stock?: number | null
          name: string
          price: number
          status?: string | null
          stock?: number | null
        }
        Update: {
          category?: string | null
          company_id?: string
          consignment_available?: boolean | null
          created_at?: string | null
          id?: string
          minimum_stock?: number | null
          name?: string
          price?: number
          status?: string | null
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          custom_interval_days: number | null
          id: string
          installments_remaining: number | null
          installments_total: number | null
          is_limited: boolean
          name: string
          next_execution: string
          payment_method_default: string | null
          recurrence_type: string
          start_date: string
          status: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          custom_interval_days?: number | null
          id?: string
          installments_remaining?: number | null
          installments_total?: number | null
          is_limited?: boolean
          name: string
          next_execution: string
          payment_method_default?: string | null
          recurrence_type: string
          start_date: string
          status?: string
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          custom_interval_days?: number | null
          id?: string
          installments_remaining?: number | null
          installments_total?: number | null
          is_limited?: boolean
          name?: string
          next_execution?: string
          payment_method_default?: string | null
          recurrence_type?: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_documents: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          reseller_id: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          reseller_id: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          reseller_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_documents_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_history: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          reseller_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          reseller_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reseller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_history_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_payments: {
        Row: {
          amount: number
          closing_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          observation: string | null
          paid_at: string | null
          payment_method: string | null
          reseller_id: string
        }
        Insert: {
          amount: number
          closing_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          observation?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reseller_id: string
        }
        Update: {
          amount?: number
          closing_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          observation?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reseller_id?: string
        }
        Relationships: []
      }
      resellers: {
        Row: {
          commission_type: string
          commission_value: number
          company_id: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          commission_type?: string
          commission_value?: number
          company_id: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          company_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resellers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          price: number
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number | null
        }
        Insert: {
          id?: string
          price: number
          product_id: string
          quantity: number
          sale_id: string
          subtotal?: number | null
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          gateway_fee_amount: number | null
          gateway_fee_percent: number | null
          gateway_id: string | null
          id: string
          installments: number | null
          interest_amount: number | null
          interest_rate_percent: number | null
          payment_method: string
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_fee_amount?: number | null
          gateway_fee_percent?: number | null
          gateway_id?: string | null
          id?: string
          installments?: number | null
          interest_amount?: number | null
          interest_rate_percent?: number | null
          payment_method: string
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_fee_amount?: number | null
          gateway_fee_percent?: number | null
          gateway_id?: string | null
          id?: string
          installments?: number | null
          interest_amount?: number | null
          interest_rate_percent?: number | null
          payment_method?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_by_email: string | null
          client_freight: number | null
          client_id: string | null
          company_id: string
          created_at: string | null
          customer_name: string | null
          discount_value: number | null
          id: string
          payment_method: string | null
          pending_balance: number | null
          sale_costs: Json | null
          seller_id: string | null
          status: string
          store_freight: number | null
          subtotal: number | null
          total: number
          total_paid: number | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_email?: string | null
          client_freight?: number | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          customer_name?: string | null
          discount_value?: number | null
          id?: string
          payment_method?: string | null
          pending_balance?: number | null
          sale_costs?: Json | null
          seller_id?: string | null
          status?: string
          store_freight?: number | null
          subtotal?: number | null
          total: number
          total_paid?: number | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_email?: string | null
          client_freight?: number | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_name?: string | null
          discount_value?: number | null
          id?: string
          payment_method?: string | null
          pending_balance?: number | null
          sale_costs?: Json | null
          seller_id?: string | null
          status?: string
          store_freight?: number | null
          subtotal?: number | null
          total?: number
          total_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          supplies: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          supplies?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          supplies?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          active: boolean
          color: string
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      warranty_requests: {
        Row: {
          batch_code: string | null
          batch_date: string | null
          company_id: string
          created_at: string
          customer_name: string | null
          id: string
          observation: string | null
          product_id: string
          reason: string | null
          request_type: string
          reseller_id: string | null
          resolution: string | null
          resolution_date: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          batch_code?: string | null
          batch_date?: string | null
          company_id: string
          created_at?: string
          customer_name?: string | null
          id?: string
          observation?: string | null
          product_id: string
          reason?: string | null
          request_type?: string
          reseller_id?: string | null
          resolution?: string | null
          resolution_date?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          batch_code?: string | null
          batch_date?: string | null
          company_id?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          observation?: string | null
          product_id?: string
          reason?: string | null
          request_type?: string
          reseller_id?: string | null
          resolution?: string | null
          resolution_date?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_requests_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company_for_user: {
        Args: { _cnpj?: string; _name: string }
        Returns: string
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: { _company_id: string }; Returns: string }
      sale_belongs_to_user_company: {
        Args: { _sale_id: string }
        Returns: boolean
      }
      user_belongs_to_company: {
        Args: { _company_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
