

## Corrigir cores do Mobile Welcome Dialog

O problema: fundo branco com logo preta (que pode parecer invisível dependendo do contexto), e os botões não seguem a estética dark do site.

### Mudança em `src/pages/HomePage.tsx` (linhas 261-310)

Trocar o esquema de cores para fundo escuro:

- **Dialog**: `bg-[#0a0a0a] border-gray-800` (fundo preto)
- **Logo "vouti."**: texto branco com ponto vermelho (já está correto o ponto, só precisa garantir texto branco)
- **Subtítulo**: `text-gray-400` 
- **Botão "Código"**: `bg-white text-[#0a0a0a]` (botão claro sobre fundo escuro)
- **Botão "Quero Conhecer"**: `border-gray-600 text-white hover:bg-white/10`
- **Input de código**: `bg-transparent border-gray-600 text-white placeholder:text-gray-500`
- **Botão "Voltar"**: `border-gray-600 text-white hover:bg-white/10`

