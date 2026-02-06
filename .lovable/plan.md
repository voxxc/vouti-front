
# Redesign Minimalista: Extras (Perfil + Google Agenda)

## Resumo
Redesenhar a página Extras aplicando o padrão de design minimalista (já utilizado em Clientes), com navegação por texto clicável e adicionar uma nova aba "Google Agenda" para sincronização de prazos.

---

## Mudanças Visuais

### 1. Navegação por Abas (Estilo Minimalista)

**Antes:** TabsList com ícones e fundo
```text
┌─────────────────────────────────────┐
│ [👤 Perfil] [🎂 Aniversários]       │
└─────────────────────────────────────┘
```

**Depois:** Links de texto simples com linha inferior ativa
```text
Perfil     Aniversários     Google Agenda
───────
```

Estilo CSS idêntico ao `ClienteDetails.tsx`:
```tsx
<div className="flex gap-6 border-b">
  <button
    onClick={() => setActiveTab('perfil')}
    className={cn(
      "pb-2 text-sm font-medium transition-colors relative",
      activeTab === 'perfil'
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    Perfil
    {activeTab === 'perfil' && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
    )}
  </button>
  ...
</div>
```

---

### 2. PerfilTab - Layout Minimalista

**Antes:** Cards com headers, ícones, títulos e descrições
**Depois:** Linhas com label à direita em uppercase e valores à esquerda

```text
┌──────────────────────────────────────────────────────────┐
│ [Avatar]  Nome do Usuário                                │
│           email@exemplo.com                              │
└──────────────────────────────────────────────────────────┘

      NOME COMPLETO    [_______________________________]
  DATA DE NASCIMENTO    [__________]

───────────────────────────────────────────────────────────

  EMAIL PROFISSIONAL    email@login.com (desabilitado)
       EMAIL PESSOAL    [_______________________________]
           TELEFONE    [_______________________________]

───────────────────────────────────────────────────────────

           ENDEREÇO    [_______________________________]
                       [_______________________________]

───────────────────────────────────────────────────────────

 CONTATO EMERGÊNCIA    Nome: [___________]
                       Tel:  [___________]
                       Rel:  [___________]

                                              [Salvar]
```

Utilizando o helper `InfoRow` para visualização e inputs inline para edição.

---

### 3. Nova Aba: Google Agenda

Nova seção para configurar a sincronização com Google Calendar:

```text
Google Agenda
─────────────

Sincronize seus prazos automaticamente com o Google Calendar.
Quando um prazo for atribuído a você, ele será adicionado
automaticamente à sua agenda pessoal do Google.

┌──────────────────────────────────────────────────────────┐
│  📅  Status: Não conectado                               │
│                                                          │
│  [Conectar com Google]                                   │
└──────────────────────────────────────────────────────────┘

Configurações (após conectado):
• Sincronizar prazos atribuídos a mim
• Notificação 1 dia antes
• Notificação 1 hora antes
```

A conexão usará o **Lovable Standard Connector** para Google Calendar, que fornece autenticação OAuth simplificada.

---

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Extras.tsx` | Substituir TabsList por navegação por texto + adicionar Google Agenda |
| `src/components/Extras/PerfilTab.tsx` | Redesenhar para layout de linhas minimalista |
| `src/components/Extras/GoogleAgendaTab.tsx` | **NOVO** - Configuração de sincronização com Google Calendar |

---

## Extras.tsx - Nova Estrutura

```tsx
const [activeTab, setActiveTab] = useState<'perfil' | 'aniversarios' | 'google-agenda'>('perfil');

return (
  <div className="space-y-4">
    {/* Header */}
    <div>
      <h1 className="text-2xl font-bold">Extras</h1>
      <p className="text-muted-foreground text-sm">Funcionalidades adicionais</p>
    </div>

    {/* Navegação Minimalista */}
    <div className="flex gap-6 border-b">
      <TabButton active={activeTab === 'perfil'} onClick={() => setActiveTab('perfil')}>
        Perfil
      </TabButton>
      <TabButton active={activeTab === 'aniversarios'} onClick={() => setActiveTab('aniversarios')}>
        Aniversários
      </TabButton>
      <TabButton active={activeTab === 'google-agenda'} onClick={() => setActiveTab('google-agenda')}>
        Google Agenda
      </TabButton>
    </div>

    {/* Conteúdo */}
    {activeTab === 'perfil' && <PerfilTab />}
    {activeTab === 'aniversarios' && <AniversariosTab />}
    {activeTab === 'google-agenda' && <GoogleAgendaTab />}
  </div>
);
```

---

## PerfilTab - Nova Estrutura

Usando o padrão `InfoRow` com campos editáveis:

```tsx
// Helper para linha com input
const EditableRow = ({ label, value, onChange, type = "text", disabled = false, placeholder = "" }) => (
  <div className="flex py-2 items-center">
    <span className="w-48 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide pr-6 shrink-0">
      {label}
    </span>
    <Input
      value={value}
      onChange={onChange}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      className="flex-1 max-w-md"
    />
  </div>
);
```

Estrutura:
1. **Header com Avatar** - compacto, apenas avatar + nome + email
2. **Seção: Dados Pessoais** - Nome, Data de Nascimento
3. **Separator**
4. **Seção: Contato** - Email profissional (disabled), email pessoal, telefone
5. **Separator**
6. **Seção: Endereço** - Textarea de endereço
7. **Separator**
8. **Seção: Emergência** - Nome, telefone, relação em grid 3 colunas
9. **Botão Salvar** - alinhado à direita

---

## GoogleAgendaTab - Estrutura

```tsx
export const GoogleAgendaTab = () => {
  // Verificar se há conexão com Google Calendar
  // Usar standard_connectors para conectar

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Explicação */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Sincronize seus prazos automaticamente com o Google Calendar.
          Quando um prazo for atribuído a você, ele será adicionado à sua agenda.
        </p>
      </div>

      {/* Card de Status */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Status da Conexão</p>
            <p className="text-sm text-muted-foreground">
              {isConnected ? '✓ Conectado' : 'Não conectado'}
            </p>
          </div>
        </div>

        {!isConnected ? (
          <Button onClick={handleConnect}>
            Conectar com Google
          </Button>
        ) : (
          <div className="space-y-3">
            {/* Configurações */}
            <div className="flex items-center justify-between">
              <Label>Sincronizar prazos atribuídos</Label>
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>
            <Button variant="outline" onClick={handleDisconnect}>
              Desconectar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Fluxo de Integração Google Calendar

1. Usuário clica em "Conectar com Google"
2. Sistema usa `standard_connectors--connect` com `connector_id: "google_calendar"`
3. Após conexão, salva configuração em `user_google_calendar_config` (tabela a criar)
4. Quando prazo é criado/atribuído ao usuário, o sistema:
   - Verifica se usuário tem conexão ativa
   - Cria evento no Google Calendar via Gateway API
   - Armazena referência do evento em `google_calendar_sync`

**Nota:** A implementação completa da sincronização automática (trigger no backend) será uma fase posterior. Nesta fase, criamos apenas a interface de configuração.

---

## Benefícios

1. **Consistência visual** - Mesmo padrão minimalista aplicado em Clientes
2. **Menos ruído visual** - Remoção de cards, ícones e headers desnecessários
3. **Navegação limpa** - Texto clicável com underline ativo
4. **Preparação para Google Calendar** - Interface pronta para integração futura
