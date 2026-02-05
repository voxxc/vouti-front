 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
       auth: { autoRefreshToken: false, persistSession: false }
     });
 
     // Verificar autenticação
     const authHeader = req.headers.get('Authorization');
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: 'Token não fornecido' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Validar token e obter usuário
     const token = authHeader.replace('Bearer ', '');
     const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
     
     if (userError || !user) {
       return new Response(
         JSON.stringify({ error: 'Token inválido' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Verificar se é Super Admin
     const { data: superAdmin, error: superAdminError } = await supabaseAdmin
       .from('super_admins')
       .select('id')
       .eq('user_id', user.id)
       .maybeSingle();
 
     if (superAdminError || !superAdmin) {
       console.log('Super admin check failed:', superAdminError);
       return new Response(
         JSON.stringify({ error: 'Apenas Super Admins podem criar administradores de tenant' }),
         { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Obter dados do body
     const { tenant_id, email, password, full_name } = await req.json();
 
     // Validações
     if (!tenant_id || !email || !password || !full_name) {
       return new Response(
         JSON.stringify({ error: 'Todos os campos são obrigatórios: tenant_id, email, password, full_name' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (password.length < 6) {
       return new Response(
         JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Bloquear domínios reservados
     const blockedDomains = ['@metalsystem.local', '@vouti.bio', '@vlink.bio'];
     if (blockedDomains.some(domain => email.toLowerCase().endsWith(domain))) {
       return new Response(
         JSON.stringify({ error: 'Este domínio de email não pode ser usado' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Verificar se tenant existe
     const { data: tenant, error: tenantError } = await supabaseAdmin
       .from('tenants')
       .select('id, name')
       .eq('id', tenant_id)
       .single();
 
     if (tenantError || !tenant) {
       return new Response(
         JSON.stringify({ error: 'Tenant não encontrado' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Verificar se usuário já existe
     const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
     const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
 
     let userId: string;
     let isExistingUser = false;
 
     if (existingUser) {
       // Usuário já existe - verificar se está no tenant correto
       const { data: existingProfile } = await supabaseAdmin
         .from('profiles')
         .select('tenant_id')
         .eq('user_id', existingUser.id)
         .maybeSingle();
 
       if (existingProfile?.tenant_id && existingProfile.tenant_id !== tenant_id) {
         return new Response(
           JSON.stringify({ error: 'Este email já está cadastrado em outro cliente. Não é possível adicionar ao cliente ' + tenant.name }),
           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
 
       // Verificar se já é admin deste tenant
       const { data: existingRole } = await supabaseAdmin
         .from('user_roles')
         .select('id')
         .eq('user_id', existingUser.id)
         .eq('tenant_id', tenant_id)
         .eq('role', 'admin')
         .maybeSingle();
 
       if (existingRole) {
         return new Response(
           JSON.stringify({ error: 'Este usuário já é administrador deste cliente' }),
           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
 
       userId = existingUser.id;
       isExistingUser = true;
       console.log('User already exists, will add admin role:', userId);
     } else {
       // Criar novo usuário
       const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
         email,
         password,
         email_confirm: true,
         user_metadata: { full_name }
       });
 
       if (createUserError || !newUser.user) {
         console.error('Error creating user:', createUserError);
         return new Response(
           JSON.stringify({ error: 'Erro ao criar usuário: ' + (createUserError?.message || 'Erro desconhecido') }),
           { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
 
       userId = newUser.user.id;
       console.log('User created:', userId);
     }
 
     // Atualizar/criar profile com tenant_id (apenas para novos usuários ou se não tiver tenant)
     if (!isExistingUser) {
       const { error: profileError } = await supabaseAdmin
         .from('profiles')
         .upsert({
           user_id: userId,
           email,
           full_name,
           tenant_id
         }, {
           onConflict: 'user_id'
         });
 
       if (profileError) {
         console.error('Error updating profile:', profileError);
         await supabaseAdmin.auth.admin.deleteUser(userId);
         return new Response(
           JSON.stringify({ error: 'Erro ao criar perfil do usuário' }),
           { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
       console.log('Profile created/updated for user:', userId);
     }
 
     // Criar role admin para o tenant
     const { error: roleError } = await supabaseAdmin
       .from('user_roles')
       .insert({
         user_id: userId,
         role: 'admin',
         tenant_id,
         is_primary: true
       });
 
     if (roleError) {
       console.error('Error creating role:', roleError);
       if (!isExistingUser) {
         await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
         await supabaseAdmin.auth.admin.deleteUser(userId);
       }
       return new Response(
         JSON.stringify({ error: 'Erro ao atribuir role de administrador' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Admin role created for user:', userId, 'in tenant:', tenant_id);

     const successMessage = isExistingUser 
       ? `${full_name} agora é administrador de ${tenant.name}` 
       : `Administrador ${full_name} criado com sucesso para ${tenant.name}`;
 
     return new Response(
       JSON.stringify({
         success: true,
         message: successMessage,
         user: {
           id: userId,
           email,
           full_name,
           was_existing: isExistingUser
         }
       }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Unexpected error:', error);
     return new Response(
       JSON.stringify({ error: 'Erro interno do servidor' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });