# West Marches Platform

Plataforma web para campanhas de RPG no estilo **West Marches**: um mundo compartilhado, persistente e explorado por múltiplos grupos de jogadores, onde rumores, mapas e histórias circulam entre campanhas diferentes.

> **Status:** MVP inicial em desenvolvimento — monorepo com frontend (React), backend (Express) e Postgres. Veja o conceito completo em [`docs/`](docs/).

## O que é West Marches

West Marches é um estilo de campanha de RPG sem um grupo fixo de jogadores nem sessões marcadas: os próprios jogadores decidem quando e para onde explorar, e o mundo continua existindo e mudando entre uma sessão e outra. Esta plataforma serve como o hub central desse mundo compartilhado — o lugar onde rumores, descobertas e o estado do mapa persistem entre campanhas e mestres diferentes.

## Estrutura do repositório

```
.
├── apps/
│   ├── backend/       # API em Express (JS), conecta no Postgres, guarda uploads, resumos e a wiki em disco
│   └── frontend/      # SPA em React + Vite (JS)
├── docs/              # Documentação de design/regras/roadmap
├── docker-compose.yml # Sobe backend + Postgres em containers
└── package.json       # Workspace raiz (pnpm)
```

## Requisitos

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+ (`corepack enable` ou `npm i -g pnpm`)
- [Docker](https://www.docker.com/) + Docker Compose (para rodar com container/Postgres)

## Como rodar

### 1. Instalar dependências

```bash
pnpm install
```

### 2a. Desenvolvimento local (sem Docker)

Sobe frontend e backend juntos:

```bash
pnpm dev
```

Ou individualmente:

```bash
pnpm dev:frontend   # http://localhost:5173
pnpm dev:backend    # http://localhost:3001
```

> Nesse modo o backend só conecta a um Postgres se houver um `DATABASE_URL` configurado no ambiente. Para banco local, use o modo Docker abaixo ou suba só o serviço `postgres` do compose (`docker compose up -d postgres`).

### 2b. Backend + Postgres via Docker

```bash
cp .env.example .env   # ajuste usuário/senha/banco se quiser
docker compose up -d --build
```

Isso sobe:
- `postgres` — Postgres 16 na porta `5432`, com volume persistente (guarda os rumores)
- `backend` — API Express na porta `3001`, já conectada ao Postgres, com volumes persistentes para a imagem do mapa (`uploads/`), os resumos em markdown dos quadrantes (`quadrants/`) e as páginas da wiki (`wiki/`)

Outros comandos úteis:

```bash
docker compose logs -f backend   # acompanhar logs do backend
docker compose down              # parar os containers
docker compose down -v           # parar e apagar os volumes (reset total: banco, uploads e resumos)
docker compose up -d --build     # reconstruir a imagem após mudanças no backend
```

Com o backend em Docker, rode o frontend localmente apontando para ele (já é o padrão, `VITE_API_URL` default é `http://localhost:3001`):

```bash
pnpm dev:frontend
```

### 3. Build de produção do frontend

```bash
pnpm --filter frontend build
```

## Login para testes

A autenticação ainda é provisória (sem tabela de usuários): qualquer usuário/senha funciona, mas o **username** `admin` sempre entra com a role `admin` — qualquer outro username vira `player`. Use `admin` / `admin` para testar as funcionalidades de admin (trocar a imagem de fundo do mapa).

## Endpoints do backend

| Método | Rota                                       | Auth           | Descrição                                             |
| ------ | ------------------------------------------- | -------------- | ------------------------------------------------------ |
| GET    | `/api/health`                               | -              | Healthcheck simples do servidor                        |
| GET    | `/api/health/db`                            | -              | Healthcheck da conexão com o Postgres                  |
| POST   | `/api/auth/login`                           | -              | Login (provisório, sem persistência ainda)              |
| GET    | `/api/map/background`                       | -              | URL da imagem de fundo atual do mapa                    |
| POST   | `/api/map/background`                       | admin          | Faz upload de uma nova imagem de fundo do mapa           |
| GET    | `/api/quadrants/:row/:col/summary`          | -              | Lê o resumo (markdown) de um quadrante                  |
| PUT    | `/api/quadrants/:row/:col/summary`          | usuário logado | Salva o resumo (markdown) de um quadrante                |
| GET    | `/api/quadrants/:row/:col/comments`         | -              | Lista os rumores de um quadrante                         |
| POST   | `/api/quadrants/:row/:col/comments`         | usuário logado | Cria um rumor (`author` opcional; vazio = anônimo)        |
| PUT    | `/api/quadrants/:row/:col/comments/:id`     | dono ou admin  | Edita um rumor                                           |
| DELETE | `/api/quadrants/:row/:col/comments/:id`     | dono ou admin  | Remove um rumor                                          |
| GET    | `/api/wiki/tree`                            | -              | Árvore de pastas/páginas da wiki                          |
| GET    | `/api/wiki/pages/*`                         | -              | Lê o conteúdo (markdown) de uma página da wiki            |
| POST   | `/api/wiki/pages`                           | admin          | Cria uma página nova (`parentPath`, `name`, `content`)    |
| PUT    | `/api/wiki/pages/*`                         | admin          | Atualiza o conteúdo de uma página existente                |
| DELETE | `/api/wiki/pages/*`                         | admin          | Remove uma página                                          |
| POST   | `/api/wiki/folders`                         | admin          | Cria uma pasta nova (`parentPath`, `name`)                 |
| DELETE | `/api/wiki/folders/*`                       | admin          | Remove uma pasta e todo o conteúdo dentro dela              |

## Funcionalidades planejadas

### Mapa Mundial
- Grid de 32×20 sobreposto a uma imagem do mundo, com proporção 16:10, alinhado à esquerda da tela
- Imagem de fundo do mapa pode ser trocada por um admin, direto pela interface
- Cada quadrante do grid abre um painel à direita com:
  - Resumo do quadrante em **Markdown**, editável por qualquer usuário logado
  - Lista de **rumores** (comentários) daquele quadrante, com CRUD completo — cada rumor pode ser atribuído a um personagem (player ou NPC) ou postado como mensagem anônima; só quem criou o rumor (ou um admin) pode editar/remover
- Marcadores de **death points** conhecidos e de **loot** (planejado)
- Quadro de missões globais, visível para todas as campanhas (planejado)
- Múltiplas campanhas podem se desenrolar simultaneamente sobre o mesmo mapa

### Wiki
- Estrutura em árvore de pastas e páginas, cada página é um arquivo `.md` guardado em `apps/backend/wiki/`
- Navegação lateral com a árvore completa; conteúdo renderizado a partir do markdown
- Só admin cria/edita/remove páginas e pastas pela interface (`/wiki`) ou via API; leitura é aberta a todos
- Categorias sugeridas: regras do jogo, personagens/NPCs conhecidos, quests em aberto

### Plataforma / Usuários
- Login por usuário
- Papéis (roles): **Admin**, **Player** e/ou **Mestrante** — qualquer jogador pode se tornar mestre de sua própria campanha
- Fichas de personagem vinculadas a cada usuário

### Campanhas em curso
- Listagem das campanhas ativas
- Cada campanha possui:
  - Um prólogo
  - Uma ata (registro) do que aconteceu nas sessões

## Regras de design do mundo

O funcionamento do mundo compartilhado segue algumas premissas centrais (detalhes em [`docs/regras.md`](docs/regras.md)):

1. Jogadores formam equipes e escolhem livremente com qual conteúdo do mundo (rumores, NPCs, etc.) querem interagir.
2. Múltiplos mestrantes podem criar conteúdo nesse mundo compartilhado — dungeons, facções, encontros aleatórios — e divulgá-lo através de NPCs ou anúncios in-game.
3. Progressão por XP: personagens sobem de nível de acordo com o quanto exploram.
4. Tesouro conta como experiência (1 PO obtido e transportado = 1 XP; itens, joias e loot em geral também contam), incentivando a exploração.
5. Contar histórias e compartilhar informações do roleplay (possivelmente neste mesmo fórum) incentiva outros grupos a visitar os mesmos locais e descobrir mais.
6. O mundo não é balanceado para o nível dos jogadores — inimigos existem independentemente disso, incentivando grupos a recuar, buscar reforços, espalhar informação para equipes mais fortes, ou morrer e deixar loot e corpos para outros encontrarem.

## Roadmap

Itens em validação/protótipo no momento (veja [`docs/road-map.md`](docs/road-map.md)):

- [x] Grid 32×20 (proporção 16:10) colado à esquerda, com painel lateral ao clicar no quadrante
- [x] Painel lateral com resumo em markdown (editável) + CRUD de rumores
- [ ] Zoom no grid do mapa
- [ ] Testar formas de tornar a adição de rumores mais imersiva
- [ ] Paginação/scroll de rumores quando o quadrante tiver muitos comentários
- [ ] Death points e marcadores de loot no grid
- [ ] Quadro de missões globais
- [x] Wiki (`/wiki`) com páginas em markdown organizadas em pastas, CRUD via API (admin)

## Contribuindo

O projeto ainda está na fase inicial de desenvolvimento. Sugestões e discussões sobre o conceito são bem-vindas via issues.
