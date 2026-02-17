
## Abrir Processo inline (dentro da aba) em vez de drawer de baixo para cima

### O que muda

Ao clicar em um processo na lista de "Processos" (dentro do workspace), em vez de abrir um `Drawer` (vaul) de baixo para cima, o conteudo do processo sera exibido **inline** dentro da propria aba, substituindo a lista -- com um botao de voltar para retornar a lista. Isso segue o mesmo padrao de navegacao interna ja usado no CRM e no Project drawer.

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `src/components/Project/ProjectProtocolosList.tsx` | Adicionar estado de navegacao interna (`view: 'lista' \| 'detalhes'`). Quando um processo e clicado, mostrar o conteudo do processo inline em vez de abrir o Drawer. |
| `src/components/Project/ProjectProtocoloDrawer.tsx` | Extrair todo o conteudo (tabs Resumo, Etapas, Prazos, etc.) para um novo componente reutilizavel `ProjectProtocoloContent`. Manter o Drawer existente como wrapper opcional para outros contextos. |
| `src/components/Project/ProjectProtocoloContent.tsx` **(novo)** | Componente que recebe o `protocolo` e todas as callbacks, renderizando o header com titulo/status/progresso e as tabs (Resumo, Etapas, Prazos, Vinculo, Historico, Relatorio). Reutiliza toda a logica ja existente no Drawer. |

---

### Detalhes tecnicos

**1. ProjectProtocoloContent.tsx (novo)**

Extrair do `ProjectProtocoloDrawer.tsx` (linhas ~102-1192) toda a logica e JSX do conteudo:
- Estados internos (editing, etapas, prazos, etc.)
- Hooks (useProjectAdvogado, useProtocoloVinculo)
- Tabs com Resumo, Etapas, Prazos, Vinculo, Historico, Relatorio
- Modais de etapa, conclusao, relatorio, advogado

A interface sera:
```text
interface ProjectProtocoloContentProps {
  protocolo: ProjectProtocolo;
  onUpdate: (id, data) => Promise<void>;
  onDelete: (id) => Promise<void>;
  onAddEtapa: ...
  onUpdateEtapa: ...
  onDeleteEtapa: ...
  projectId?: string;
  onRefetch?: () => Promise<void>;
  onClose?: () => void;  // botao de voltar
}
```

**2. ProjectProtocoloDrawer.tsx (simplificado)**

Manter como wrapper fino que renderiza o `Drawer` (vaul) ao redor de `ProjectProtocoloContent`. Assim, se algum outro lugar ainda usar o drawer de baixo para cima, continua funcionando.

**3. ProjectProtocolosList.tsx (navegacao interna)**

Substituir a abertura do drawer por navegacao interna:

```text
// Estado
const [view, setView] = useState<'lista' | 'detalhes'>('lista');

// Ao clicar no processo
const handleProtocoloClick = (protocolo) => {
  setSelectedProtocoloId(protocolo.id);
  setView('detalhes');
};

// Render
if (view === 'detalhes' && selectedProtocolo) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setView('lista')}>
          <ArrowLeft />
        </Button>
        <span className="font-semibold">{selectedProtocolo.nome}</span>
      </div>
      <ProjectProtocoloContent
        protocolo={selectedProtocolo}
        onUpdate={updateProtocolo}
        onDelete={async (id) => {
          await deleteProtocolo(id);
          setView('lista');
        }}
        onAddEtapa={addEtapa}
        onUpdateEtapa={updateEtapa}
        onDeleteEtapa={deleteEtapa}
        projectId={projectId}
        onRefetch={refetch}
        onClose={() => setView('lista')}
      />
    </div>
  );
}

// Senao, renderiza a lista normalmente (sem o ProjectProtocoloDrawer)
```

O `ProjectProtocoloDrawer` deixa de ser usado neste componente, mas permanece no codigo para compatibilidade com outros pontos que possam usa-lo.

---

### Resultado visual

- Clicar em um processo na lista -> a lista desaparece e o conteudo do processo aparece no mesmo espaco, com um botao de voltar (seta) no topo
- As tabs (Resumo, Etapas, Prazos, etc.) ficam dentro da area da aba "Processos"
- Voltar -> retorna a lista de processos
- Sem drawer de baixo para cima
