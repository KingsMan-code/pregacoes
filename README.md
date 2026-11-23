# Pregações

Esboços de pregação em Markdown, publicados como site no GitHub Pages.

## Estrutura

```
index.html                     lista de pregações
assets/style.css, pregacao.js  visual e montagem dos cards
AAAA-MM-DD-nome/
  esboco.md                    o esboço (edite aqui)
  index.html                   página que lê o esboco.md
```

A página lê o `esboco.md` e monta um card expansível para cada título `##`.
Os `###` aparecem como resumo dentro do card.

## Nova pregação

1. Copie uma pasta existente com o novo nome (ex.: `2026-12-07-casa-viva-70`).
2. Troque o `esboco.md` e a data/texto no `index.html` da pasta.
3. Adicione um card no `index.html` da raiz.
4. `git add . && git commit -m "..." && git push`
