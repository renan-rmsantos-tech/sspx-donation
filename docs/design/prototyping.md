---
target: library
host: vite-app # galeria @compozy/proto ao lado do app Next, com vite.config.ts próprio
prototypes: "src/**/*.proto.tsx"
entry: "src/drafts/{slug}/index.proto.tsx"
providers: proto.canvas.tsx
dev: npm run proto dev
preview: "http://127.0.0.1:4481/__proto/render/{slug}?chrome=0"
evidence: "npm run proto -- evidence {slug} --state <id>"
output: "docs/design/{slug}/"
---

# Protótipos

A galeria `@compozy/proto` renderiza as views reais do app com fixtures, um estado
por vez, e guarda os comentários de revisão em `proto/review/`. As skills `proto` e
`proto-apply-comments` descrevem autoria e revisão; ficam em `.agents/skills/` (não
versionado) com links em `.claude/skills/`. Para instalá-las ou atualizá-las, rode
`npx proto init --skills`.

```bash
npm run proto dev            # galeria em http://127.0.0.1:4480 (render em :4481)
npm run proto check          # valida meta, guards e compilação; rode antes da revisão
npm run proto -- screenshot product-detail --state meta-atingida
```

As capturas vão para `docs/design/<slug>/`; não versione os PNGs.

## Onde ficam

- **Protótipo de componente**: `<view>.proto.tsx` ao lado da view, com fixtures em
  `<view>.fixtures.ts`. Só compõe a view, sem markup próprio. O nome do arquivo vira o
  slug, que precisa ser kebab-case: `ProductDetail.tsx` tem
  `product-detail.proto.tsx` e `product-detail.fixtures.ts`.
- **Draft**: `src/drafts/<slug>/index.proto.tsx`, exploração com markup livre antes de
  a view existir. Quando a ideia firmar, vira view com protótipo de componente.
- **Seções**: cada protótipo declara `spec` no `meta`: `publico` (Site público) ou
  `painel` (Painel administrativo), definidas em `proto.config.ts`.

Protótipos atuais:

| Slug | View | Estados |
| --- | --- | --- |
| `product-detail` | `src/features/products/components/ProductDetail.tsx` | Pix ou material, bolsa só Pix, Pix não configurado, meta atingida |
| `admin-dashboard` | `src/features/dashboard/components/AdminDashboard.tsx` | com doações, transferências disponíveis, sem doações |

## Canvas e Frame

`proto.canvas.tsx` carrega `src/app/globals.css` e `proto/canvas.css`. O `Canvas`
fornece as server actions de fixture e o `Toaster`. O `Frame` envolve os protótipos de
componente com o `AdminShell` real do painel, com "Sair" sem efeito; o `meta.route`
marca o item ativo do menu. Telas públicas usam `standalone: true` e ficam sem o
`Frame`.

O app carrega a Playfair Display pelo `next/font`, que não roda no Vite. Na galeria,
`proto/canvas.css` faz `--font-playfair` cair na Playfair instalada no sistema ou na
serifada do sistema.

## Next.js dentro do Vite

O app é Next; a galeria compila com `vite.config.ts`, que o `next build` e o Vitest
não leem. `next/link`, `next/image` e `next/navigation` são trocados pelas versões de
`proto/next/`: links não navegam, imagens são `<img>` servidas de `public/` e
`usePathname()` devolve o `meta.route` do protótipo. Componentes de servidor
(`async`, `next/headers`) e server actions não rodam na galeria: a página busca os
dados e passa por props para a view, como em `src/app/(public)/products/[id]/page.tsx`
com `ProductDetail`.

## Server actions nas views

Os formulários de doação (`MonetaryDonationForm`, `PhysicalPledgeForm`) não importam
`actions.ts`. Eles pedem a action ao contexto com `useServerAction('nome')`
(`src/components/server-actions.tsx`), e a página do item entrega as actions reais com
`ServerActionsProvider`. Uma action nova chamada por uma view precisa entrar nesse
provider. Logout segue a mesma ideia: o layout passa `adminLogout` para o
`AdminShell` pela prop `onLogout`.

Na galeria, o `Canvas` fornece `fixtureActions()` (`proto/server-actions.fixtures.ts`):
o envio de comprovante devolve um caminho fictício e qualquer outra action resolve
`{ success: true }`, então enviar um formulário mostra o aviso de sucesso real. Um
protótipo sobrepõe o que seus estados precisam com outro provider, por exemplo
`<ServerActionsProvider actions={fixtureActions({ createPhysicalPledge: async () => ({ success: false, error: 'ALREADY_FULFILLED' }) })}>`.
Nos testes, o `render` envolve a view com `ServerActionsProvider` e mocks `vi.fn()`.

## Guards

`guards.forbidRuntimeImports` em `proto.config.ts` faz `proto check` falhar com
`network_import` quando um protótipo alcança banco, sessão, storage, envio de e-mail,
`actions.ts`, `queries.ts` ou as APIs de servidor do Next (`next/headers`,
`next/server`, `next/cache`, `server-only`). `import type` continua liberado. A
correção é tirar o acesso da view e passar por props ou pelo contexto, nunca afrouxar
o guard. As views do admin além do painel ainda importam suas actions direto; para
prototipá-las, leve as actions para o contexto primeiro.
