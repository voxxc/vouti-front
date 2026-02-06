
Objetivo
- Remover completamente qualquer exibição de “barra de conclusão” e “x% completo” relacionada a projetos (inclusive em telas onde ainda aparece).
- Na página /projects (no seu caso /solvenza/projects), trocar o layout de cards em grade por um esquema de lista, mantendo a data de criação visível.

O que encontrei no código (causa provável do que você ainda está vendo)
1) “x% completo” + barra abaixo do nome do projeto existe claramente no header do projeto
- Arquivo: src/pages/ProjectView.tsx
- Trecho atual:
  - calcula: const projectProgress = calculateProjectProgress(project.tasks, columns);
  - renderiza:
    - <Progress value={projectProgress} ... />
    - <span>{projectProgress}% completo</span>
Isso explica exatamente o “x% completo” e a barra “abaixo do nome”.

2) Em /projects, o código atual (src/pages/Projects.tsx) não tem barra de progresso renderizada no estado “carregado”
- Porém, no skeleton de loading (quando ainda está carregando) existe uma faixa horizontal (Skeleton className="h-2 w-full rounded-full") que pode ser percebida como “barra de progresso”.
- Também no drawer (src/components/Projects/ProjectsDrawer.tsx) o skeleton de loading tem uma linha final “h-2 w-full” que pode parecer uma barra.

Plano de implementação (mudanças de UI)
A) Remover a estrutura de % de conclusão no header do projeto (onde ainda está explícito)
Arquivo: src/pages/ProjectView.tsx
- Remover:
  - import { calculateProjectProgress } from "@/utils/projectHelpers";
  - import { Progress } from "@/components/ui/progress";
  - const projectProgress = calculateProjectProgress(...)
  - o bloco JSX que mostra a barra + “{projectProgress}% completo”
- Resultado esperado:
  - No header do projeto ficará apenas: nome (editável) + cliente, sem qualquer referência a progresso.

B) Garantir que /projects não mostre nada que pareça barra de progresso
Arquivo: src/pages/Projects.tsx
1) Converter a visualização para “lista”
- Substituir o container atual:
  - <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  por um layout de lista, por exemplo:
  - <div className="divide-y rounded-lg border bg-card">
  - Cada projeto vira uma “linha” clicável com:
    - Nome do projeto (destaque)
    - Cliente (subtexto)
    - Data de criação (manter visível de forma clara)
    - (Opcional) contagem de tarefas e updatedAt em uma área secundária
    - Botão de excluir (admin) alinhado à direita, sem quebrar o clique da linha
- Manter a data de criação:
  - hoje você já tem project.createdAt no hook e já está exibindo no card; vamos manter na linha da lista, por exemplo:
    - “Criado em dd/MM/yyyy”

2) Ajustar skeleton para não ter “faixa que parece progress”
- No skeleton de carregamento, remover/substituir a linha:
  - <Skeleton className="h-2 w-full rounded-full" />
- Trocar por algo que não lembre uma barra (ex.: mais uma linha curta de texto, ou um bloco com largura parcial), por exemplo:
  - <Skeleton className="h-4 w-24" />
Isso elimina a “barra” durante o carregamento.

C) Garantir que o drawer de projetos não exiba “barra” nem no loading
Arquivo: src/components/Projects/ProjectsDrawer.tsx
- No skeleton do loading (cada item), hoje existe:
  - <Skeleton className="h-2 w-full" />
- Substituir por uma linha de texto curta (não full width), ou remover esse terceiro skeleton.
- Isso evita que o usuário interprete a terceira linha como uma “barra de conclusão”.

Checklist de validação (após implementar)
1) /solvenza/projects
- Com dados carregados: nenhum projeto mostra barra ou “x% completo”.
- Durante loading: skeleton não contém “barra” horizontal que pareça progresso.
- Visual em lista: nome, cliente e “Criado em dd/MM/yyyy” aparecem em cada linha.

2) /solvenza/project/:id
- Header não mostra barra e não mostra “x% completo”.

3) Drawer “Projetos” (sidebar)
- Lista carregada: sem barra.
- Loading skeleton: sem linha que pareça barra.

Arquivos que serão alterados
- src/pages/ProjectView.tsx (remover UI e lógica de progresso no header)
- src/pages/Projects.tsx (trocar grid por lista + ajustar skeleton)
- src/components/Projects/ProjectsDrawer.tsx (ajustar skeleton para não parecer barra)

Notas técnicas (para manter o projeto consistente)
- Não vou apagar a função calculateProjectProgress nem o Phase 2 do useProjectsOptimized; apenas vamos parar de mostrar “progresso” nessas telas. Assim, se você quiser reutilizar em dashboard/relatórios no futuro, fica disponível.
