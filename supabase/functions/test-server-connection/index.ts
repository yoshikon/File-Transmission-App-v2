import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return -1;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpAllowed(clientIp: string, allowList: { ip_address: string; enabled: boolean }[]): boolean {
  const enabled = allowList.filter((r) => r.enabled);
  if (enabled.length === 0) return true;
  const clientNum = ipToNumber(clientIp);
  if (clientNum === -1) return false;
  for (const rule of enabled) {
    const addr = rule.ip_address.trim();
    if (addr.includes("/")) {
      const [base, prefixStr] = addr.split("/");
      const prefix = parseInt(prefixStr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) continue;
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      const baseNum = ipToNumber(base);
      if (baseNum === -1) continue;
      if ((clientNum & mask) === (baseNum & mask)) return true;
    } else {
      if (clientNum === ipToNumber(addr)) return true;
    }
  }
  return false;
}

async function checkIpRestriction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  req: Request,
): Promise<boolean> {
  const { data: rules } = await supabase
    .from("ip_restrictions")
    .select("ip_address, enabled")
    .eq("user_id", userId);
  if (!rules || rules.length === 0) return true;
  const clientIp = getClientIp(req);
  return isIpAllowed(clientIp, rules);
}

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

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ipAllowed = await checkIpRestriction(serviceSupabase, user.id, req);
    if (!ipAllowed) {
      return new Response(
        JSON.stringify({ error: "Access denied: IP address not allowed", connected: false }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
