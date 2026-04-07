

## Plano: Busca de Processos por CPF via Judit (Super Admin)

### Objetivo
Adicionar funcionalidade no Super Admin para digitar um CPF e listar todos os processos judiciais associados àquela pessoa, usando a API Judit com `search_type: 'cpf'` e `response_type: 'lawsuit'`.

### Implementação

#### 1. Nova Edge Function: `judit-buscar-processos-cpf`
- Recebe `{ cpf: string }`
- Formata CPF com pontuação (xxx.xxx.xxx-xx)
- Chama `POST https://requests.prod.judit.io/requests` com payload:
  ```json
  { "search": { "search_type": "cpf", "search_key": "xxx.xxx.xxx-xx" } }
  ```
- Faz polling em `GET /responses?request_id=...&page=1&page_size=100`
- Retorna lista de processos encontrados (CNJ, partes, tribunal, etc.)
- Usa `JUDIT_API_KEY` (já configurada)

#### 2. Novo Componente: `SuperAdminBuscaProcessosCPF.tsx`
- Input de CPF com máscara (xxx.xxx.xxx-xx)
- Botão "Buscar Processos"
- Loading com spinner
- Tabela de resultados com colunas: CNJ, Partes (Ativa/Passiva), Tribunal, Status
- Accordion ou card expansível para ver detalhes completos (JSON)
- Contador de processos encontrados

#### 3. Registro no Super Admin (`src/pages/SuperAdmin.tsx`)
- Adicionar item "Busca CPF (Processos)" no dropdown **Ferramentas**
- Nova tab value: `busca-cpf-processos`
- Import e TabsContent do novo componente

### Arquivos
- **Criar**: `supabase/functions/judit-buscar-processos-cpf/index.ts`
- **Criar**: `src/components/SuperAdmin/SuperAdminBuscaProcessosCPF.tsx`
- **Editar**: `src/pages/SuperAdmin.tsx` (dropdown + tab)

