
# Sistema Completo de Automação de Prazos Processuais

## Visão Geral

Sistema que cria automaticamente prazos na Agenda quando novas intimações ou audiências são detectadas, calculando em **dias úteis** e considerando **feriados forenses**.

---

## Tipos de Eventos Detectados

### 1. Intimações para Atos Processuais

| Tipo de Ato | Prazo | Dias Úteis | Fundamento CPC |
|-------------|-------|------------|----------------|
| Contestação | 15 | Sim | Art. 335 |
| Réplica | 15 | Sim | Art. 351 |
| Embargos de Declaração | 5 | Sim | Art. 1.023 |
| Agravo de Instrumento | 15 | Sim | Art. 1.016 |
| Agravo Interno | 15 | Sim | Art. 1.021 |
| Apelação | 15 | Sim | Art. 1.003 |
| Recurso Especial/Extraordinário | 15 | Sim | Art. 1.029 |
| Impugnação ao Cumprimento | 15 | Sim | Art. 525 |
| Embargos à Execução | 15 | Sim | Art. 915 |
| Emenda à Inicial | 15 | Sim | Art. 321 |
| Pagamento Voluntário | 3 | Sim | Art. 523 |
| Manifestação Genérica | 15 | Sim | Art. 218 |
| Alegações Finais | 15 | Sim | Art. 364 |

### 2. Audiências (Novo!)

| Tipo de Audiência | Categoria | Cor Badge |
|-------------------|-----------|-----------|
| Audiência de Conciliação | conciliacao | Azul |
| Audiência de Mediação | mediacao | Verde |
| Audiência de Instrução | instrucao | Laranja |
| Audiência de Instrução e Julgamento | instrucao | Laranja |
| Sessão Virtual de Julgamento | julgamento | Vermelho |
| Audiência Una | una | Roxo |

**Padrões detectados nos dados reais:**
- `AUDIÊNCIA DE CONCILIAÇÃO DESIGNADA (Agendada para: 01 de abril de 2026 às 14:01...)`
- `INCLUÍDO EM PAUTA PARA SESSÃO VIRTUAL DE 02/03/2026 00:00 ATÉ 06/03/2026 23:59`

---

## Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DA AUTOMAÇÃO                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Webhook recebe novo andamento                                       │
│              │                                                          │
│              ├──→ É intimação? ───→ Detectar tipo do ato                │
│              │         │                    │                           │
│              │         │              Calcular prazo CPC                │
│              │         │              (dias úteis)                      │
│              │         │                    │                           │
│              │         ▼                    ▼                           │
│              │    ┌─────────────────────────────┐                       │
│              │    │   Criar prazo na Agenda     │                       │
│              │    │   + Notificar advogado      │                       │
│              │    └─────────────────────────────┘                       │
│              │                                                          │
│              └──→ É audiência? ──→ Extrair data/hora                   │
│                        │                 │                              │
│                        │           Extrair local/modalidade             │
│                        │                 │                              │
│                        ▼                 ▼                              │
│                   ┌─────────────────────────────┐                       │
│                   │ Criar prazo tipo "audiência"│                       │
│                   │ na data exata do evento     │                       │
│                   └─────────────────────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Novas Tabelas

### 1. Prazos Padrão CPC

```sql
CREATE TABLE prazos_processuais_cpc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ato TEXT NOT NULL UNIQUE,
  tipo_ato_label TEXT NOT NULL,
  prazo_dias INTEGER NOT NULL,
  dias_uteis BOOLEAN DEFAULT TRUE,
  fundamento_legal TEXT,
  categoria TEXT,  -- 'resposta', 'recurso', 'manifestacao', 'audiencia'
  padroes_deteccao TEXT[],  -- Padrões regex para detectar
  ativo BOOLEAN DEFAULT TRUE
);
```

### 2. Feriados Forenses

```sql
CREATE TABLE feriados_forenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL,  -- 'nacional', 'estadual', 'forense'
  uf TEXT,
  tribunal_sigla TEXT,
  recorrente BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE
);
```

### 3. Configuração por Processo

```sql
ALTER TABLE processos_oab ADD COLUMN 
  prazo_automatico_ativo BOOLEAN DEFAULT FALSE,
  prazo_advogado_responsavel_id UUID,
  prazo_usuarios_marcados UUID[] DEFAULT '{}';
```

### 4. Log de Automação

```sql
CREATE TABLE prazos_automaticos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id UUID,
  andamento_id UUID,
  deadline_id UUID,
  tipo_evento TEXT,  -- 'intimacao' ou 'audiencia'
  tipo_ato_detectado TEXT,
  prazo_dias INTEGER,
  data_inicio DATE,
  data_fim DATE,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Função SQL: Calcular Dias Úteis

```sql
CREATE FUNCTION calcular_prazo_dias_uteis(
  p_data_inicio DATE,
  p_prazo_dias INTEGER,
  p_tenant_id UUID,
  p_tribunal_sigla TEXT DEFAULT NULL
) RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_data_atual DATE := p_data_inicio;
  v_dias_contados INTEGER := 0;
BEGIN
  WHILE v_dias_contados < p_prazo_dias LOOP
    v_data_atual := v_data_atual + 1;
    
    -- Pular sábado (6) e domingo (0)
    IF EXTRACT(DOW FROM v_data_atual) NOT IN (0, 6) THEN
      -- Verificar se não é feriado
      IF NOT EXISTS (
        SELECT 1 FROM feriados_forenses f
        WHERE f.data = v_data_atual
          AND f.ativo = TRUE
          AND (f.tenant_id = p_tenant_id OR f.tenant_id IS NULL)
          AND (f.tribunal_sigla = p_tribunal_sigla OR f.tribunal_sigla IS NULL)
      ) THEN
        v_dias_contados := v_dias_contados + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_data_atual;
END;
$$;
```

---

## Componentes Frontend

### 1. Card de Automação (no ProcessoOABDetalhes)

```text
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️  Automação de Prazos                              [Toggle]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [✓] Ativar criação automática de prazos                        │
│                                                                 │
│  Advogado Responsável:                                          │
│  [▼ Selecione o advogado responsável                        ]   │
│                                                                 │
│  Colaboradores (opcional):                                      │
│  [Tag: João] [Tag: Maria] [+ Adicionar]                         │
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│                                                                 │
│  📋 Tipos de eventos monitorados:                               │
│  • Intimações (Contestação, Réplica, Recursos...)               │
│  • Audiências (Conciliação, Instrução, Julgamento)              │
│                                                                 │
│  ℹ️ Prazos calculados em dias úteis conforme CPC               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Gerenciador de Feriados (/admin/feriados)

```text
┌─────────────────────────────────────────────────────────────────┐
│  📅 Feriados Forenses                    [+ Adicionar Feriado]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filtros: [2026 ▼] [Tipo: Todos ▼] [UF: Todos ▼]               │
│                                                                 │
│  ┌───────────────┬──────────────────────────────┬────────────┐  │
│  │ 01/01/2026    │ Confraternização Universal   │ Nacional   │  │
│  │ 16-17/02/2026 │ Carnaval                     │ Nacional   │  │
│  │ 03/04/2026    │ Sexta-feira Santa            │ Nacional   │  │
│  │ 21/04/2026    │ Tiradentes                   │ Nacional   │  │
│  │ 01/05/2026    │ Dia do Trabalho              │ Nacional   │  │
│  │ 04/06/2026    │ Corpus Christi               │ Nacional   │  │
│  │ 07/09/2026    │ Independência                │ Nacional   │  │
│  │ 12/10/2026    │ N. Sra. Aparecida            │ Nacional   │  │
│  │ 02/11/2026    │ Finados                      │ Nacional   │  │
│  │ 15/11/2026    │ Proclamação da República     │ Nacional   │  │
│  │ 20/12-06/01   │ Recesso Forense              │ Forense    │  │
│  │ 25/12/2026    │ Natal                        │ Nacional   │  │
│  └───────────────┴──────────────────────────────┴────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detector de Tipo de Ato

### `src/utils/tipoAtoDetector.ts`

| Padrão na Descrição | Tipo Detectado | Prazo |
|---------------------|----------------|-------|
| `apresentar contestação` / `para contestar` | Contestação | 15d |
| `réplica` / `impugnação à contestação` | Réplica | 15d |
| `embargos de declaração` | Embargos de Declaração | 5d |
| `agravo de instrumento` | Agravo de Instrumento | 15d |
| `agravo interno` / `agravo regimental` | Agravo Interno | 15d |
| `apelação` / `apelar` | Apelação | 15d |
| `recurso especial` | REsp | 15d |
| `recurso extraordinário` | RE | 15d |
| `impugnação ao cumprimento` | Impugnação | 15d |
| `embargos à execução` | Embargos Execução | 15d |
| `emenda` / `emendar` | Emenda à Inicial | 15d |
| `pagamento voluntário` / `pagar` | Pagamento | 3d |
| `manifestar` / `manifestação` | Manifestação | 15d |
| `alegações finais` / `razões finais` | Alegações Finais | 15d |

### `src/utils/audienciaDetector.ts` (Novo!)

| Padrão na Descrição | Tipo Detectado |
|---------------------|----------------|
| `audiência de conciliação designada` | Conciliação |
| `audiência de mediação` | Mediação |
| `audiência de instrução e julgamento` | Instrução e Julgamento |
| `audiência de instrução` | Instrução |
| `sessão virtual` / `incluído em pauta` | Sessão Virtual |
| `audiência una` | Audiência Una |

**Extração de data/hora:**
```typescript
// Padrão 1: "Agendada para: 01 de abril de 2026 às 14:01"
// Padrão 2: "SESSÃO VIRTUAL DE 02/03/2026 00:00 ATÉ 06/03/2026"
// Padrão 3: "(23/01/2026)"
```

---

## Modificação no Webhook

### `judit-webhook-oab/index.ts`

```typescript
// Após inserir novo andamento, verificar automação
if (processo.prazo_automatico_ativo) {
  
  // 1. Verificar se é audiência
  const audiencia = detectarAudiencia(andamento.descricao);
  if (audiencia) {
    await criarPrazoAudiencia({
      processoId: processo.id,
      titulo: `📅 ${audiencia.tipo}: ${processo.numero_cnj}`,
      data: audiencia.dataHora,
      advogadoId: processo.prazo_advogado_responsavel_id,
      taggedUsers: processo.prazo_usuarios_marcados,
      local: audiencia.local,
      modalidade: audiencia.modalidade
    });
  }
  
  // 2. Verificar se é intimação
  const intimacao = parseIntimacao(andamento.descricao);
  if (intimacao.isIntimacao && intimacao.status === 'ABERTO') {
    const tipoAto = detectarTipoAto(andamento.descricao);
    if (tipoAto) {
      const dataFinal = await calcularPrazoDiasUteis(
        intimacao.dataInicial || new Date(),
        tipoAto.prazoDias,
        processo.tenant_id,
        processo.tribunal_acronym
      );
      
      await criarPrazoIntimacao({
        processoId: processo.id,
        titulo: `⚠️ ${tipoAto.label}: ${processo.numero_cnj}`,
        data: dataFinal,
        advogadoId: processo.prazo_advogado_responsavel_id,
        taggedUsers: processo.prazo_usuarios_marcados,
        fundamentoLegal: tipoAto.fundamentoLegal
      });
    }
  }
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Descrição |
|---------|-----------|
| `migrations/` | Criar tabelas e funções SQL |
| `src/utils/tipoAtoDetector.ts` | Detectar tipo de ato processual |
| `src/utils/audienciaDetector.ts` | Detectar audiências e extrair data/hora |
| `src/utils/diasUteisCalculator.ts` | Cálculo de dias úteis (frontend) |
| `src/components/Controladoria/AutomacaoPrazosCard.tsx` | Card de configuração |
| `src/components/Admin/FeriadosManager.tsx` | Gerenciador de feriados |
| `src/hooks/useFeriadosForenses.ts` | Hook para feriados |
| `src/hooks/usePrazosAutomaticos.ts` | Hook para automação |
| `supabase/functions/judit-webhook-oab/index.ts` | Lógica de automação |
| `src/components/Controladoria/ProcessoOABDetalhes.tsx` | Integrar card |

---

## Feriados Pré-cadastrados (2025-2026)

| Data | Descrição | Tipo |
|------|-----------|------|
| 01/01 | Confraternização Universal | Nacional |
| Variável | Carnaval (seg-ter) | Nacional |
| Variável | Sexta-feira Santa | Nacional |
| 21/04 | Tiradentes | Nacional |
| 01/05 | Dia do Trabalho | Nacional |
| Variável | Corpus Christi | Nacional |
| 07/09 | Independência | Nacional |
| 12/10 | N. Sra. Aparecida | Nacional |
| 02/11 | Finados | Nacional |
| 15/11 | Proclamação da República | Nacional |
| 25/12 | Natal | Nacional |
| 20/12 - 06/01 | Recesso Forense | Forense |

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Prazos criados manualmente | Criação automática de intimações e audiências |
| Dias corridos | Dias úteis conforme CPC |
| Sem considerar feriados | Considera feriados nacionais e forenses |
| Audiências não rastreadas | Audiências como prazos com data/hora/local |
| Risco de perda de prazo | Notificação automática ao advogado |
