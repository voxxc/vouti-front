-- Permitir operadores deletarem registros de fluxo do próprio setor
create policy "Operators can delete their sector flows"
on metal_setor_flow
for delete
using (
  exists (
    select 1
    from metal_profiles mp
    where mp.user_id = auth.uid()
      and mp.setor = metal_setor_flow.setor
  )
);