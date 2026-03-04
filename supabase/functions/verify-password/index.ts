import { createClient } from "jsr:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto@1";
import { encodeHex } from "jsr:@std/encoding@1/hex";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hashBuffer));
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return encodeHex(array);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "hash") {
      const { password, delivery_id } = body;

      if (!password || !delivery_id) {
        return new Response(
          JSON.stringify({ error: "password and delivery_id are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const {
        data: { user },
      } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      const passwordHash = `${salt}:${hash}`;

      const supabase = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: updateError } = await supabase
        .from("deliveries")
        .update({ password_hash: passwordHash })
        .eq("id", delivery_id)
        .eq("sender_id", user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to save password hash" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const { password, delivery_token } = body;

      if (!password || !delivery_token) {
        return new Response(
          JSON.stringify({
            error: "password and delivery_token are required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: recipientData } = await supabase
        .from("delivery_recipients")
        .select("delivery_id")
        .eq("token", delivery_token)
        .maybeSingle();

      if (!recipientData) {
        return new Response(
          JSON.stringify({ error: "Invalid token", verified: false }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: delivery } = await supabase
        .from("deliveries")
        .select("password_hash, password_protected")
        .eq("id", recipientData.delivery_id)
        .maybeSingle();

      if (!delivery) {
        return new Response(
          JSON.stringify({ error: "Delivery not found", verified: false }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!delivery.password_protected || !delivery.password_hash) {
        return new Response(JSON.stringify({ verified: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [salt, storedHash] = delivery.password_hash.split(":");
      const inputHash = await hashPassword(password, salt);

      const verified = inputHash === storedHash;

      return new Response(JSON.stringify({ verified }), {
        status: verified ? 200 : 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'hash' or 'verify'" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
