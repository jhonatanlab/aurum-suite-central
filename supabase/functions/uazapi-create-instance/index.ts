import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyId } = await req.json();
    
    if (!companyId) {
      throw new Error("companyId é obrigatório");
    }

    console.log(`[Uazapi] Criando instância para empresa: ${companyId}`);

    // Check if company already has an ACTIVE instance (status != 'expired')
    const { data: existingInstance, error: existingError } = await supabase
      .from("whatsapp_instances")
      .select("id, status, instance_id")
      .eq("company_id", companyId)
      .neq("status", "expired")
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingInstance) {
      console.log(`[Uazapi] Empresa ${companyId} já possui instância ativa: ${existingInstance.id} (status: ${existingInstance.status})`);
      throw new Error(`Esta empresa já possui uma instância ativa (status: ${existingInstance.status}). Exclua a instância existente antes de criar uma nova.`);
    }

    // Get admin settings for Uazapi
    const { data: adminSettings, error: adminError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token", "uazapi_webhook_url"]);

    if (adminError) throw adminError;

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;
    const webhookUrl = adminSettings?.find((s) => s.key === "uazapi_webhook_url")?.value;

    if (!baseEndpoint || !masterToken) {
      throw new Error("Configurações Uazapi não encontradas. Configure endpoint e token no Admin > WhatsApp.");
    }

    console.log(`[Uazapi] Usando endpoint: ${baseEndpoint}`);

    // Generate unique instance_id
    const instanceId = `inst_${companyId.slice(0, 8)}_${Date.now()}`;

    // Step 1: Call POST /instance/init to create instance
    console.log(`[Uazapi] Step 1: Inicializando instância: ${instanceId}`);
    const initResponse = await fetch(`${baseEndpoint}/instance/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admintoken": masterToken,
      },
      body: JSON.stringify({
        Name: instanceId,
        qrcode: true,
      }),
    });

    const initResult = await initResponse.json();
    console.log(`[Uazapi] Resposta init:`, JSON.stringify(initResult).slice(0, 500));

    // Handle case where /instance/init doesn't exist, fallback to /instance/create
    if (!initResponse.ok && initResult.code === 404) {
      console.log(`[Uazapi] /instance/init not found, trying /instance/create`);
      const createResponse = await fetch(`${baseEndpoint}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "admintoken": masterToken,
        },
        body: JSON.stringify({
          Name: instanceId,
          qrcode: true,
        }),
      });

      const createResult = await createResponse.json();
      console.log(`[Uazapi] Resposta create:`, JSON.stringify(createResult).slice(0, 500));

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar instância: ${JSON.stringify(createResult)}`);
      }

      // Use create result
      Object.assign(initResult, createResult);
    } else if (!initResponse.ok) {
      throw new Error(`Erro ao inicializar instância: ${JSON.stringify(initResult)}`);
    }

    // Extract instance token from response
    const instanceToken = initResult.token || initResult.instance?.token || masterToken;

    // Step 2: Save initial record with status 'created'
    console.log(`[Uazapi] Step 2: Salvando instância no banco com status 'created'`);
    const { data: instanceRecord, error: insertError } = await supabase
      .from("whatsapp_instances")
      .insert({
        company_id: companyId,
        instance_id: instanceId,
        instance_token: instanceToken,
        status: "created",
        qr_code: null,
      })
      .select()
      .single();
      
    if (insertError) throw insertError;

    console.log(`[Uazapi] Instância salva no banco: ${instanceRecord.id}`);

    // Step 3: Configure webhook if URL is set
    let webhookConfigured = false;
    if (webhookUrl) {
      console.log(`[Uazapi] Step 3: Configurando webhook: ${webhookUrl}`);
      
      // Try different webhook endpoints
      const webhookEndpoints = [
        { url: `${baseEndpoint}/webhook/set`, method: "PUT" },
        { url: `${baseEndpoint}/instance/setWebhook`, method: "POST" },
        { url: `${baseEndpoint}/instance/${instanceId}/webhook`, method: "POST" },
      ];

      for (const endpoint of webhookEndpoints) {
        try {
          const webhookResponse = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              "Content-Type": "application/json",
              "token": instanceToken,
              "admintoken": masterToken,
            },
            body: JSON.stringify({
              instanceName: instanceId,
              Name: instanceId,
              url: webhookUrl,
              webhook: webhookUrl,
              enabled: true,
              events: ["messages.upsert", "connection.update", "status"],
            }),
          });

          if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            console.log(`[Uazapi] Webhook configurado via ${endpoint.url}:`, JSON.stringify(webhookResult).slice(0, 200));
            webhookConfigured = true;
            break;
          } else {
            const errorText = await webhookResponse.text();
            console.log(`[Uazapi] Webhook falhou via ${endpoint.url}: ${errorText.slice(0, 200)}`);
          }
        } catch (webhookError) {
          console.log(`[Uazapi] Erro ao configurar webhook via ${endpoint.url}:`, webhookError);
        }
      }

      if (!webhookConfigured) {
        console.log(`[Uazapi] Não foi possível configurar webhook automaticamente`);
      }
    } else {
      console.log(`[Uazapi] Webhook URL não configurada, pulando configuração`);
    }

    // Step 4: Get QR Code and update status to 'qrcode'
    console.log(`[Uazapi] Step 4: Obtendo QR Code e atualizando status para 'qrcode'`);
    
    let qrCode = null;
    
    // Check if QR code was returned in init response
    if (initResult.qrcode) {
      if (typeof initResult.qrcode === 'string') {
        qrCode = initResult.qrcode;
      } else if (initResult.qrcode.base64) {
        qrCode = initResult.qrcode.base64;
      }
    } else if (initResult.instance?.qrcode) {
      qrCode = initResult.instance.qrcode;
    }

    // If no QR code yet, try to get it via connect endpoint
    if (!qrCode) {
      console.log(`[Uazapi] QR não veio no init, tentando /instance/connect`);
      
      const connectResponse = await fetch(`${baseEndpoint}/instance/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken,
          "admintoken": masterToken,
        },
        body: JSON.stringify({
          Name: instanceId,
          instanceName: instanceId,
        }),
      });

      if (connectResponse.ok) {
        const connectResult = await connectResponse.json();
        console.log(`[Uazapi] Resposta connect:`, JSON.stringify(connectResult).slice(0, 300));
        
        if (connectResult.qrcode) {
          if (typeof connectResult.qrcode === 'string') {
            qrCode = connectResult.qrcode;
          } else if (connectResult.qrcode.base64) {
            qrCode = connectResult.qrcode.base64;
          }
        } else if (connectResult.base64) {
          qrCode = connectResult.base64;
        }
      }
    }

    // Update instance with QR code and status 'qrcode'
    const { error: updateError } = await supabase
      .from("whatsapp_instances")
      .update({
        status: qrCode ? "qrcode" : "created",
        qr_code: qrCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceRecord.id);

    if (updateError) {
      console.error(`[Uazapi] Erro ao atualizar status:`, updateError);
    }

    console.log(`[Uazapi] Instância criada com sucesso. Status: ${qrCode ? 'qrcode' : 'created'}, Webhook: ${webhookConfigured}`);

    return new Response(
      JSON.stringify({
        success: true,
        instance: {
          ...instanceRecord,
          status: qrCode ? "qrcode" : "created",
          qr_code: qrCode,
        },
        qrcode: qrCode,
        webhookConfigured,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Uazapi] Erro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
