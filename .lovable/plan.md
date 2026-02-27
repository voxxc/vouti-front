

## Trocar foto de fundo da tela de Auth

### O que será feito
Gerar uma nova imagem de escritório com conceito diferente usando AI (Nano banana pro para maior qualidade) e substituir o arquivo `src/assets/auth-office-bg.jpg`.

### Ideia da nova imagem
Um escritório moderno e minimalista com luz natural entrando por janelas grandes, mesa de trabalho clean com notebook, planta decorativa, tons neutros e acolhedores — transmitindo profissionalismo e conforto.

### Passos
1. Gerar nova imagem via `google/gemini-3-pro-image-preview` com prompt de escritório moderno
2. Salvar como `src/assets/auth-office-bg.jpg` (substituindo o atual)
3. Nenhuma mudança de código necessária — o import já aponta para esse arquivo

