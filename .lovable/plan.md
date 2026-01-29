

## Melhorias no Super Admin - Detalhamento por Tenant e Investigacao de Processos

### Analise dos Problemas

**Problema 1: Processos sem atualizacao**
Os processos `0045144-39.2025.8.16.0021` e `0002836-50.2025.8.16.0065` nao receberam novos andamentos porque:
- A API Judit retorna os dados do `request_id` mais recente do tracking
- Se nao houver novo request_id apos a ultima sincronizacao, os mesmos dados sao retornados
- A deduplicacao impede insercao de dados ja existentes (correto)
- **Possivel causa**: O monitoramento da Judit ainda nao processou novas atualizacoes para esses processos

**Problema 2: Super Admin sem detalhes**
Atualmente mostra apenas totais agregados, sem visibilidade de:
- Quais processos foram atualizados
- Detalhes por tenant
- Navegacao entre tenants

---

### Solucao Proposta

#### Parte 1: Melhorar Retorno da Edge Function

Modificar `judit-sync-monitorados` para retornar dados detalhados por tenant e processo:

```typescript
interface SyncResultDetailed {
  total_processos: number;
  processos_verificados: number;
  processos_atualizados: number;
  novos_andamentos: number;
  erros: string[];
  // NOVO: Detalhes por tenant
  por_tenant: {
    tenant_id: string;
    tenant_name: string;
    processos_verificados: number;
    processos_atualizados: number;
    novos_andamentos: number;
    processos_detalhes: {
      numero_cnj: string;
      novos_andamentos: number;
      ultimo_andamento_data?: string;
    }[];
  }[];
}
```

---

#### Parte 2: Redesenhar Interface do Super Admin

**Nova estrutura com abas por tenant:**

```
+----------------------------------------------------------+
|  Monitoramento de Processos                              |
|  [Todos os Tenants v] [Sincronizar Agora]                |
+----------------------------------------------------------+
|                                                          |
|  Cards de Resumo (Total, Ativos, Sem Tracking)           |
|                                                          |
+----------------------------------------------------------+
|  Resultado da Ultima Sincronizacao                       |
|  +-------------------------------------------------------+
|  | [Solvenza] [AMSADV] [Outro Tenant]                    | <- Abas
|  +-------------------------------------------------------+
|  | Solvenza - 45 processos verificados                   |
|  | +---------------------------------------------------+ |
|  | | CNJ                    | Novos | Ultimo Andamento | |
|  | |------------------------|-------|------------------| |
|  | | 0012919-29.2025...     |   3   | 26/01/2026       | |
|  | | 1052085-77.2023...     |   4   | 28/01/2026       | |
|  | | (processos sem novos andamentos ficam colapsados) | |
|  | +---------------------------------------------------+ |
|  +-------------------------------------------------------+
+----------------------------------------------------------+
```

---

### Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/judit-sync-monitorados/index.ts` | Modificar para retornar dados detalhados por tenant |
| `src/components/SuperAdmin/SuperAdminMonitoramento.tsx` | Redesenhar UI com abas por tenant e lista de processos |

---

### Detalhes Tecnicos

#### Edge Function - Mudancas

```typescript
// Estrutura de resultado detalhado
const resultsByTenant = new Map<string, {
  tenant_id: string;
  tenant_name: string;
  processos_verificados: number;
  processos_atualizados: number;
  novos_andamentos: number;
  processos_detalhes: Array<{
    numero_cnj: string;
    novos_andamentos: number;
    ultimo_andamento_data?: string;
  }>;
}>();

// Durante o loop, acumular resultados por tenant
// Buscar nome do tenant ao iniciar
// Adicionar detalhes de cada processo atualizado
```

#### Frontend - Mudancas

1. **Interface atualizada** para receber dados detalhados
2. **Componente de Tabs** para navegar entre tenants
3. **Tabela de processos** mostrando quais tiveram atualizacoes
4. **Filtro** para mostrar apenas processos com novos andamentos
5. **Indicadores visuais** para processos que deveriam ter atualizado mas nao atualizaram

---

### Resultado Esperado

Apos implementacao:
1. Super Admin vera exatamente quais processos foram atualizados
2. Navegacao por abas permite focar em tenant especifico
3. Lista detalhada mostra CNJ + quantidade de novos andamentos + data
4. Facilita identificar processos que nao estao recebendo atualizacoes da Judit

---

### Sobre os Processos Sem Atualizacao

Os processos `0045144-39.2025.8.16.0021` e `0002836-50.2025.8.16.0065` nao atualizaram porque:

1. **A API Judit retorna o mesmo request_id** - nao houve nova consulta
2. **Os andamentos ja existem no banco** - deduplicacao funciona corretamente
3. **Possiveis causas**:
   - O monitoramento diario da Judit ainda nao executou para esses processos
   - O webhook da Judit nao esta sendo chamado (problema ja identificado anteriormente)

**Recomendacao**: Apos implementar as melhorias de visibilidade, poderemos identificar quais processos estao com problema no lado da Judit. Se necessario, podemos criar um botao para "Forcar Nova Consulta" que faz um POST para a Judit solicitar nova busca dos dados (isso teria custo adicional na API).

