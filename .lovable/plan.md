

# Redesign Minimalista do ClienteDetails

## Visual de Referencia

A imagem mostra um layout extremamente limpo:
- Labels em **UPPERCASE** alinhados a direita
- Valores a esquerda (quando existem)
- **Separadores horizontais** entre secoes
- **Sem cards, boxes ou backgrounds**
- Espacamento vertical consistente

---

## Estrutura Proposta

```text
NOME (PF)                    Joao da Silva
TELEFONE                     (11) 99999-9999
E-MAIL                       joao@email.com
DATA DE NASCIMENTO           01/01/1990
─────────────────────────────────────────────

CPF                          123.456.789-00
CNH                          12345678901
VALIDADE CNH                 01/01/2025
─────────────────────────────────────────────

DATA DE FECHAMENTO           15/01/2024
VALOR DO CONTRATO            R$ 5.000,00
FORMA DE PAGAMENTO           Parcelado
NUMERO DE PARCELAS           10x
─────────────────────────────────────────────

ORIGEM                       Instagram
REDE SOCIAL                  @cliente
─────────────────────────────────────────────

OBSERVACOES                  Texto das observacoes...
```

---

## Alteracoes no ClienteDetails.tsx

### Remover
- Todos os componentes `<Card>`, `<CardHeader>`, `<CardContent>`
- Backgrounds coloridos
- Grid de 2 colunas para dados

### Adicionar
- Layout de lista vertical com rows simples
- Cada row: `label (uppercase, text-right)` + `valor (text-left)`
- Separadores `<Separator />` ou `<hr />` entre secoes
- Componente helper `InfoRow` para consistencia

---

## Componente Helper

```typescript
const InfoRow = ({ label, value }: { label: string; value?: string | React.ReactNode }) => {
  if (!value) return null;
  return (
    <div className="flex py-2">
      <span className="w-48 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide pr-6">
        {label}
      </span>
      <span className="flex-1 text-sm">
        {value}
      </span>
    </div>
  );
};
```

---

## Secoes com Separadores

```typescript
{/* Dados Pessoais */}
<InfoRow label="NOME" value={cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica} />
<InfoRow label="TELEFONE" value={cliente.telefone} />
<InfoRow label="E-MAIL" value={cliente.email} />
<InfoRow label="DATA DE NASCIMENTO" value={formatDate(cliente.data_nascimento)} />
<InfoRow label="ENDERECO" value={cliente.endereco} />

<Separator className="my-4" />

{/* Documentos */}
<InfoRow label="CPF" value={cliente.cpf} />
<InfoRow label="CNPJ" value={cliente.cnpj} />
<InfoRow label="CNH" value={cliente.cnh} />
<InfoRow label="VALIDADE CNH" value={formatDate(cliente.cnh_validade)} />

<Separator className="my-4" />

{/* Contrato */}
<InfoRow label="DATA DE FECHAMENTO" value={formatDate(cliente.data_fechamento)} />
<InfoRow label="VALOR DO CONTRATO" value={formatCurrency(cliente.valor_contrato)} />
...
```

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/CRM/ClienteDetails.tsx` | Remover cards, implementar layout flat com InfoRow e separadores |

---

## Resultado Visual

**Antes (atual)**:
```text
+------------------------+
| Card: Dados Pessoais   |
| +--------------------+ |
| | Nome: Joao         | |
| | Tel: 99999         | |
| +--------------------+ |
+------------------------+
```

**Depois (minimalista)**:
```text
          NOME   Joao da Silva
      TELEFONE   (11) 99999-9999
        E-MAIL   joao@email.com
───────────────────────────────
           CPF   123.456.789-00
           CNH   12345678901
```

---

## Beneficios

- **Visual limpo**: Sem distracao de boxes e backgrounds
- **Leitura facil**: Labels alinhados facilitam scan visual
- **Menos codigo**: Remove dependencias de Card components
- **Consistente**: Mesmo padrao para todas as informacoes
- **Profissional**: Aspecto mais sofisticado e moderno

