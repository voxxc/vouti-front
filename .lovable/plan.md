

## Controle para o tenant /cordeiro + exclusao de linhas

### Resumo

1. Duplicar os 78 registros de `controle_clientes` do tenant `/demorais` para o tenant `/cordeiro` (ID `272d9707-53b8-498d-bcc1-ea074b6c8c71`), gerando novos UUIDs. Cada tenant tera seus dados completamente independentes.
2. Adicionar funcionalidade de exclusao individual e em massa no componente `ControleTab.tsx`.

---

### 1. Dados para o tenant /cordeiro

Executar um INSERT via SQL que copia todos os registros do demorais para o cordeiro com novos IDs:

```sql
INSERT INTO controle_clientes (tenant_id, cliente, placa, renavam, cnh, cpf_cnpj, validade_cnh, proximo_prazo, obs, ultima_consulta)
SELECT '272d9707-53b8-498d-bcc1-ea074b6c8c71', cliente, placa, renavam, cnh, cpf_cnpj, validade_cnh, proximo_prazo, obs, ultima_consulta
FROM controle_clientes
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750';
```

O RLS ja garante o isolamento -- cada tenant so ve seus proprios registros.

---

### 2. Exclusao individual e em massa no ControleTab.tsx

Alteracoes no componente:

- **Coluna de selecao**: Adicionar uma coluna de checkbox na primeira posicao de cada linha para selecao.
- **Checkbox "selecionar todos"** no header da tabela para marcar/desmarcar todos os registros filtrados.
- **Botao "Excluir selecionados"** (icone lixeira) ao lado do botao "+" -- aparece apenas quando ha itens selecionados. Mostra um `AlertDialog` de confirmacao antes de excluir.
- **Exclusao individual**: Botao de lixeira pequeno na ultima coluna de cada linha, tambem com confirmacao via `AlertDialog`.
- Estado `selectedIds: Set<string>` para rastrear as linhas marcadas.

---

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| Dados SQL (insert tool) | Copiar 78 registros para tenant cordeiro |
| `src/components/Extras/ControleTab.tsx` | Adicionar checkboxes de selecao, exclusao individual e em massa |

