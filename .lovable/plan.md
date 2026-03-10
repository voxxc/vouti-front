

## Inverter cores do Mobile Welcome Dialog

Trocar o esquema de cores para fundo branco com botões pretos:

### Mudança em `src/pages/HomePage.tsx` (linhas 261-310)

- **DialogContent**: `bg-white border-gray-200` (fundo branco)
- **Logo "vouti."**: `text-black` (logo preta)
- **Subtítulo**: `text-gray-600`
- **Botão "Código"**: `bg-black text-white hover:bg-gray-800`
- **Botão "Quero Conhecer"**: `bg-black text-white hover:bg-gray-800` (sem variant outline)
- **Input de código**: `bg-white border-gray-300 text-black placeholder:text-gray-400`
- **Botão "Voltar"**: `bg-black text-white hover:bg-gray-800`

