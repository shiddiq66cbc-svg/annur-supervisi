import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TeacherInput = {
  id: string;
  full_name: string;
  nip: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function generatePassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));

  let password = "Annur@";

  for (let i = 0; i < bytes.length; i++) {
    password += alphabet[bytes[i] % alphabet.length];
  }

  return password;
}

function makeInternalEmail(teacherId: string) {
  return `guru_${teacherId}@mtsannur1.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method tidak diizinkan." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error:
          "Konfigurasi Supabase Function belum lengkap: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
      },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return json({ error: "Tidak terautentikasi." }, 401);
  }

  /*
   * Client untuk memvalidasi identitas admin berdasarkan JWT pengguna.
   * Client ini TIDAK menggunakan service role.
   */
  const userClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      "",
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Sesi login tidak valid." }, 401);
  }

  /*
   * Client service-role hanya berada di server.
   * Jangan pernah memindahkan key ini ke React.
   */
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  /*
   * Pastikan pemanggil benar-benar administrator.
   */
  const { data: adminRole, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    return json(
      {
        error: "Gagal memeriksa hak administrator.",
        detail: roleError.message,
      },
      500,
    );
  }

  if (!adminRole) {
    return json(
      {
        error: "Hanya Administrator yang boleh membuat akun guru.",
      },
      403,
    );
  }

  let body: { teacherIds?: string[] } = {};

  try {
    body = await req.json();
  } catch {
    return json({ error: "Payload JSON tidak valid." }, 400);
  }

  const teacherIds = Array.isArray(body.teacherIds)
    ? body.teacherIds.filter((id): id is string => typeof id === "string")
    : [];

  let query = adminClient
    .from("teachers")
    .select("id, full_name, nip, user_id")
    .eq("is_active", true);

  if (teacherIds.length > 0) {
    query = query.in("id", teacherIds);
  } else {
    query = query.is("user_id", null);
  }

  const { data: teachers, error: teacherError } = await query.order(
    "full_name",
  );

  if (teacherError) {
    return json(
      {
        error: "Gagal mengambil data guru.",
        detail: teacherError.message,
      },
      500,
    );
  }

  const results: Array<{
    teacher_id: string;
    full_name: string;
    email: string;
    password: string | null;
    status: "created" | "already_linked" | "failed";
    message?: string;
  }> = [];

  for (const teacher of (teachers ?? []) as TeacherInput[]) {
    /*
     * Kalau guru sudah mempunyai user_id, jangan membuat akun kedua.
     */
    const existingTeacher = teacher as TeacherInput & {
      user_id?: string | null;
    };

    if (existingTeacher.user_id) {
      results.push({
        teacher_id: teacher.id,
        full_name: teacher.full_name,
        email: "",
        password: null,
        status: "already_linked",
      });

      continue;
    }

    const email = makeInternalEmail(teacher.id);
    const password = generatePassword();

    try {
      /*
       * Buat akun Auth yang sebenarnya.
       */
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: teacher.full_name,
            nip: teacher.nip,
            account_type: "guru",
          },
        });

      if (authError || !authData.user) {
        throw new Error(
          authError?.message ?? "Supabase tidak mengembalikan user.",
        );
      }

      const userId = authData.user.id;

      /*
       * Buat/update profile.
       */
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: teacher.full_name,
            nip: teacher.nip,
            email,
            is_active: true,
          },
          {
            onConflict: "id",
          },
        );

      if (profileError) {
        await adminClient.auth.admin.deleteUser(userId);
        throw new Error(
          `Gagal membuat profile: ${profileError.message}`,
        );
      }

      /*
       * Hubungkan guru dengan Auth User.
       */
      const { error: updateTeacherError } = await adminClient
        .from("teachers")
        .update({
          user_id: userId,
        })
        .eq("id", teacher.id);

      if (updateTeacherError) {
        await adminClient.auth.admin.deleteUser(userId);
        throw new Error(
          `Gagal menghubungkan guru: ${updateTeacherError.message}`,
        );
      }

      /*
       * Pastikan role guru hanya satu.
       */
      const { error: roleDeleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleDeleteError) {
        await adminClient.auth.admin.deleteUser(userId);
        throw new Error(
          `Gagal membersihkan role lama: ${roleDeleteError.message}`,
        );
      }

      const { error: roleInsertError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "guru",
        });

      if (roleInsertError) {
        await adminClient.auth.admin.deleteUser(userId);
        throw new Error(
          `Gagal menetapkan role guru: ${roleInsertError.message}`,
        );
      }

      results.push({
        teacher_id: teacher.id,
        full_name: teacher.full_name,
        email,
        password,
        status: "created",
      });
    } catch (error) {
      results.push({
        teacher_id: teacher.id,
        full_name: teacher.full_name,
        email,
        password: null,
        status: "failed",
        message:
          error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
      });
    }
  }

  const created = results.filter((r) => r.status === "created");
  const failed = results.filter((r) => r.status === "failed");
  const alreadyLinked = results.filter(
    (r) => r.status === "already_linked",
  );

  return json({
    success: failed.length === 0,
    summary: {
      total: results.length,
      created: created.length,
      failed: failed.length,
      already_linked: alreadyLinked.length,
    },
    accounts: results,
  });
});
