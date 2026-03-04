import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", connected: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", connected: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { host, port, protocol } = await req.json();

    if (!host || !port) {
      return new Response(
        JSON.stringify({ error: "host and port are required", connected: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const connected = await testConnection(host, Number(port), protocol);

    return new Response(
      JSON.stringify({
        connected,
        host,
        port,
        protocol,
        tested_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message, connected: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function testConnection(host: string, port: number, protocol: string): Promise<boolean> {
  try {
    if (protocol === "SFTP" || protocol === "FTP") {
      const conn = await Deno.connect({ hostname: host, port, transport: "tcp" });
      const buf = new Uint8Array(256);
      const timer = setTimeout(() => conn.close(), 5000);
      try {
        const n = await conn.read(buf);
        clearTimeout(timer);
        conn.close();
        if (n && n > 0) {
          const banner = new TextDecoder().decode(buf.subarray(0, n));
          if (protocol === "SFTP" && banner.startsWith("SSH")) return true;
          if (protocol === "FTP" && banner.startsWith("220")) return true;
          return true;
        }
        return false;
      } catch {
        clearTimeout(timer);
        conn.close();
        return false;
      }
    }

    const conn = await Deno.connect({ hostname: host, port, transport: "tcp" });
    conn.close();
    return true;
  } catch {
    return false;
  }
}
