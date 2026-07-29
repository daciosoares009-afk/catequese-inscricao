# Catequese Presente

Sistema web para gestão pastoral de catequese, construído com Next.js,
TypeScript, PostgreSQL, Prisma e Tailwind CSS.

## O que está implementado

- autenticação por e-mail e senha com hash bcrypt, sessão HTTP-only e proteção de rotas;
- permissões de Administrador, Coordenador e Catequista;
- dashboard conectado ao banco;
- catequizandos, responsáveis e vínculos muitos-para-muitos;
- sacramentos e etapas administráveis;
- turmas, matrículas com preservação de histórico e encontros;
- chamada manual e presença por QR Code com token seguro;
- prevenção de duplicidade por aluno/encontro;
- regras de turma para catequista e bloqueio de encontro encerrado;
- comunicados e abertura manual do WhatsApp;
- relatório básico em tela e exportação CSV;
- auditoria e exclusão lógica nas entidades críticas.

## Requisitos

- Node.js 20 ou superior;
- um projeto Supabase com PostgreSQL.

## Conexão com o Supabase

O sistema continua usando Prisma para acessar o PostgreSQL hospedado pelo
Supabase. A autenticação permanece no próprio sistema com bcrypt e sessão
HTTP-only; ela não usa Supabase Auth.

1. No painel do Supabase, abra **Connect**.
2. Copie a URL **Transaction pooler** (porta `6543`) para `DATABASE_URL`.
3. Copie a URL **Session pooler** (porta `5432`) para `DIRECT_URL`.
4. Mantenha `pgbouncer=true`, `connection_limit=1` e `sslmode=require` na `DATABASE_URL`.
5. Mantenha `sslmode=require` na `DIRECT_URL`.
6. Se a senha contiver símbolos reservados, codifique-os para URL.

Nunca exponha essas URLs em código do navegador, commits ou variáveis
prefixadas com `NEXT_PUBLIC_`.

## Instalação

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`, `DIRECT_URL` e `AUTH_SECRET`.
2. Instale as dependências com `npm install`.
3. Confira a conexão com `npm run db:check`.
4. Aplique as migrações com `npm run db:deploy`.
5. Carregue os dados iniciais com `npm run db:seed`.
6. Inicie com `npm run dev` e abra `http://localhost:3000`.

Antes de publicar, execute `npm test`, `npm run typecheck`, `npm run lint` e
`npm run build`.

## Credenciais de demonstração

Todos os usuários usam a senha `Catequese@2026` no seed:

- Administrador: `admin@catequesepresente.com`
- Coordenador: `coordenador@catequesepresente.com`
- Catequista: `maria@catequesepresente.com`
- Catequista: `jose@catequesepresente.com`

Troque todas as senhas antes de usar em produção.

## Banco e regras críticas

O schema está em `prisma/schema.prisma`. A restrição única
`(catechumenId, meetingId)` impede presença duplicada. Tokens QR usam 32 bytes
aleatórios e nunca levam dados pessoais. Matrículas encerradas não são
apagadas; transferências preservam a linha do tempo. Exclusões importantes
usam `deletedAt`.

## Deploy

Configure `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` e `NEXT_PUBLIC_APP_URL`,
execute `npm run db:deploy`, depois `npm run build` e `npm start`. Em Vercel,
use o mesmo conjunto de variáveis e execute `npm run db:deploy` no processo de
release.

Consulte também `DIAGNOSTICO.md` para as correções de segurança aplicadas e as
dependências externas necessárias antes do deploy.
