import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UploadRequest {
  delivery_file_id: string;
  server_config_id: string;
  storage_path: string;
  file_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
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
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: UploadRequest = await req.json();
    const { delivery_file_id, server_config_id, storage_path, file_name } = body;

    if (!delivery_file_id || !server_config_id || !storage_path || !file_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: serverConfig, error: configError } = await serviceSupabase
      .from("server_configs")
      .select("*")
      .eq("id", server_config_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (configError || !serverConfig) {
      return new Response(
        JSON.stringify({ error: "Server config not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await serviceSupabase
      .from("delivery_files")
      .update({ server_upload_status: "uploading", server_config_id })
      .eq("id", delivery_file_id);

    const { data: fileData, error: downloadError } = await serviceSupabase.storage
      .from("delivery-files")
      .download(storage_path);

    if (downloadError || !fileData) {
      await serviceSupabase
        .from("delivery_files")
        .update({ server_upload_status: "failed", server_upload_error: downloadError?.message ?? "Storage download failed" })
        .eq("id", delivery_file_id);

      return new Response(
        JSON.stringify({ success: false, error: "Failed to download file from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const uploadPath = `${serverConfig.upload_path}/${delivery_file_id}_${file_name}`.replace(/\/+/g, "/");

    let uploadSuccess = false;
    let uploadError = "";

    if (serverConfig.protocol === "SFTP") {
      const result = await uploadViaSftp(serverConfig, uploadPath, fileBytes);
      uploadSuccess = result.success;
      uploadError = result.error ?? "";
    } else if (serverConfig.protocol === "FTP") {
      const result = await uploadViaFtp(serverConfig, uploadPath, fileBytes);
      uploadSuccess = result.success;
      uploadError = result.error ?? "";
    } else {
      uploadSuccess = false;
      uploadError = `Protocol ${serverConfig.protocol} is not supported for direct upload. Only SFTP and FTP are supported.`;
    }

    if (uploadSuccess) {
      await serviceSupabase
        .from("delivery_files")
        .update({
          server_upload_status: "success",
          server_config_id,
          server_path: uploadPath,
          server_upload_error: null,
        })
        .eq("id", delivery_file_id);

      return new Response(
        JSON.stringify({ success: true, server_path: uploadPath }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await serviceSupabase
        .from("delivery_files")
        .update({ server_upload_status: "failed", server_upload_error: uploadError })
        .eq("id", delivery_file_id);

      return new Response(
        JSON.stringify({ success: false, error: uploadError }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function uploadViaSftp(
  config: { host: string; port: string; username: string; password_enc: string },
  remotePath: string,
  data: Uint8Array
): Promise<{ success: boolean; error?: string }> {
  try {
    const conn = await Deno.connect({ hostname: config.host, port: parseInt(config.port, 10) || 22, transport: "tcp" });

    const banner = new Uint8Array(256);
    await Promise.race([
      conn.read(banner),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);

    conn.close();

    return { success: false, error: "SFTP upload requires SSH client library. File stored in Supabase Storage instead." };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "SFTP connection failed" };
  }
}

async function uploadViaFtp(
  config: { host: string; port: string; username: string; password_enc: string },
  remotePath: string,
  data: Uint8Array
): Promise<{ success: boolean; error?: string }> {
  try {
    const controlConn = await Deno.connect({
      hostname: config.host,
      port: parseInt(config.port, 10) || 21,
      transport: "tcp",
    });

    const read = async (conn: Deno.TcpConn): Promise<string> => {
      const buf = new Uint8Array(4096);
      const n = await Promise.race([
        conn.read(buf),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("FTP read timeout")), 10000)),
      ]);
      if (!n) return "";
      return new TextDecoder().decode(buf.subarray(0, n as number));
    };

    const write = async (conn: Deno.TcpConn, cmd: string) => {
      await conn.write(new TextEncoder().encode(cmd + "\r\n"));
    };

    await read(controlConn);

    await write(controlConn, `USER ${config.username}`);
    const userResp = await read(controlConn);
    if (!userResp.startsWith("331")) {
      controlConn.close();
      return { success: false, error: `FTP USER command failed: ${userResp.trim()}` };
    }

    await write(controlConn, `PASS ${config.password_enc}`);
    const passResp = await read(controlConn);
    if (!passResp.startsWith("230")) {
      controlConn.close();
      return { success: false, error: `FTP authentication failed: ${passResp.trim()}` };
    }

    await write(controlConn, "TYPE I");
    await read(controlConn);

    await write(controlConn, "PASV");
    const pasvResp = await read(controlConn);
    const pasvMatch = pasvResp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (!pasvMatch) {
      controlConn.close();
      return { success: false, error: "FTP PASV mode failed" };
    }

    const dataHost = `${pasvMatch[1]}.${pasvMatch[2]}.${pasvMatch[3]}.${pasvMatch[4]}`;
    const dataPort = parseInt(pasvMatch[5], 10) * 256 + parseInt(pasvMatch[6], 10);

    const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));
    const fileName = remotePath.substring(remotePath.lastIndexOf("/") + 1);

    if (dir) {
      await write(controlConn, `MKD ${dir}`);
      await read(controlConn);
      await write(controlConn, `CWD ${dir}`);
      await read(controlConn);
    }

    await write(controlConn, `STOR ${fileName}`);

    const dataConn = await Deno.connect({ hostname: dataHost, port: dataPort, transport: "tcp" });

    const storResp = await read(controlConn);
    if (!storResp.startsWith("125") && !storResp.startsWith("150")) {
      dataConn.close();
      controlConn.close();
      return { success: false, error: `FTP STOR failed: ${storResp.trim()}` };
    }

    let offset = 0;
    while (offset < data.length) {
      const chunk = data.subarray(offset, offset + 65536);
      await dataConn.write(chunk);
      offset += chunk.length;
    }
    dataConn.close();

    const completionResp = await read(controlConn);
    const success = completionResp.startsWith("226") || completionResp.startsWith("250");

    await write(controlConn, "QUIT");
    controlConn.close();

    if (success) {
      return { success: true };
    }
    return { success: false, error: `FTP transfer incomplete: ${completionResp.trim()}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "FTP upload failed" };
  }
}
