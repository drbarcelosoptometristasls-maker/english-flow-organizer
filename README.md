# English Flow Organizer

Organizador inteligente de estudos de inglês com foco em fala. Seus PDFs viram uma trilha diária com revisão espaçada e prática oral obrigatória.

## Como rodar

Pré-requisito: [Node.js 18+](https://nodejs.org).

```bash
cd english-flow-organizer
npm install
npm run dev
```

Abra http://localhost:5173.

## Primeiro uso

1. **Criar conta** — use seu e-mail e uma senha. Confirme o cadastro pelo link enviado ao e-mail.
2. **Materiais** (menu lateral) — importe os 6 PDFs, um em cada linha. O sistema conta as páginas e cria as unidades de estudo automaticamente.
3. **Início** — o plano do dia é gerado sozinho. Toque em "Plano de hoje" e siga o passo a passo. Todo dia termina com a atividade de fala gravada.

## O que já está configurado

- Banco Supabase: projeto `english-flow-organizer` (região São Paulo), 8 tabelas com RLS, buckets privados `materials` e `recordings`.
- O arquivo `.env` já contém a URL e a chave publicável do projeto.

## Deploy na Vercel (opcional)

1. Crie um repositório no GitHub e envie esta pasta.
2. Na Vercel: **Add New Project** → importe o repositório.
3. Em *Environment Variables*, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (mesmos valores do `.env`).
4. Deploy. Depois, no Supabase, em **Authentication → URL Configuration**, adicione a URL da Vercel em *Site URL*.

## Estrutura

- `src/lib/planner.ts` — gerador do plano diário (tema + frases + phrasal verbs + pronúncia + revisões + fala).
- `src/lib/srs.ts` — repetição espaçada (SM-2 simplificado).
- `src/pages/Study.tsx` — wizard do estudo do dia.
- `src/pages/Review.tsx` — revisão falada (fale antes de ver a página).
- `src/pages/Import.tsx` — importação dos PDFs e fatiamento em unidades.
