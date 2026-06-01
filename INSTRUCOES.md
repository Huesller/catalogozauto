# Z Automotiva — Catálogo com Scraper Zetta

## Como rodar

```bash
npm install
npx playwright install chromium
npm run scrape
```

Depois abra:

```text
catalogo-gerado/index.html
```

## Catálogos configurados

A ordem está definida no `scraper.js`:

1. MARCA RETOV — ID 1436
2. MARCA RIDA — ID 1438
3. MARCA TYC — ID 1494
4. MARCA RETROVISORES TYC — ID 1493
5. MARCA Z AUTO — ID 1437

Para adicionar outro catálogo, adicione no array `CATALOGOS`:

```js
{ id: 'NOVO_ID', nome: 'NOME DO CATÁLOGO', marca: 'MARCA' }
```

## WhatsApp

Edite os vendedores no `scraper.js`:

```js
const VENDEDORES = [
  { nome: 'Vendedor 1', whatsapp: '554733054401' },
  { nome: 'Vendedor 2', whatsapp: '5547999999999' },
];
```

Use somente números com DDI + DDD + número.

## Saída gerada

O scraper gera:

```text
catalogo-gerado/index.html              Catálogo único com todos os produtos
catalogo-gerado/catalogo-completo.json  JSON com todos os produtos
catalogo-gerado/catalogos.json          Resumo dos catálogos processados
catalogo-gerado/1436.html               Catálogo individual
catalogo-gerado/1438.html               Catálogo individual
catalogo-gerado/1494.html               Catálogo individual
catalogo-gerado/1493.html               Catálogo individual
catalogo-gerado/1437.html               Catálogo individual
```

## Melhorias incluídas

- Index geral com todos os catálogos em um lugar.
- IDs cadastrados na ordem solicitada.
- Deduplicação mais segura por marca + código + código fabricante + descrição.
- Captura de preço corrigida para não descartar valor 0.
- Captura de código mais flexível, aceitando letras, hífens e barras.
- Resolução de imagem com mais fallbacks: `img`, `imgMin`, `imagem`, `foto`, `image`, `src`, código e código fabricante.
- Carrinho mostra código principal antes do código fabricante.
- Dois botões de WhatsApp configuráveis.
