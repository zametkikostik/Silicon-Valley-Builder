# Silicon Valley Builder (SVB)

**Self-hostable AI App Builder** — open-source alternative to Lovable + Bolt.new with Admin panel, Stripe, MCP, Git integrations, SEO & AI Search and WebContainers.

User writes a prompt → AI generates full-stack React + TypeScript + Tailwind app → live preview in WebContainers → Git push → SEO audit → deploy.

**Ready-to-run product**, not a demo skeleton.

## Features

- **AI Builder** — multi-model (OpenAI, Anthropic, xAI/Grok, Groq, DeepSeek, Ollama and any OpenAI-compatible)
- **Admin panel** — connect neural nets via API keys, priorities, logs
- **Stripe** — subscriptions + generation credits + webhooks
- **WebContainers** — real Node.js sandbox in the browser
- **MCP Servers** — Model Context Protocol support
- **Git** — GitHub, GitLab, Bitbucket (OAuth + push/pull)
- **SEO & AI Search** — Discoverability, SEO review, AI visibility, GSC-ready
- **i18n** — RU / EN / BG / ZH / ES / FR / IT
- **Self-host** — one command on any VDS (Ubuntu 22.04/24.04)

## Quick start (local)

```bash
git clone https://github.com/zametkikostik/Silicon-Valley-Builder.git
cd Silicon-Valley-Builder
cp .env.example .env
# edit .env — at least DATABASE_URL, NEXTAUTH_SECRET, one LLM key

docker compose up -d
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000

## Install on VDS (Ubuntu 22.04 / 24.04)

1. Install Docker + Node 20
2. Clone repo, copy `.env.example` → `.env`, set DOMAIN and secrets
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. `docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy`
5. `docker compose -f docker-compose.prod.yml exec app npx prisma db seed`

Caddy issues Let's Encrypt automatically when DOMAIN is set.

Full details in the repository README source.

## Admin

Sign in with ADMIN_EMAIL / ADMIN_PASSWORD from seed.
Go to `/admin` to add LLM providers (API keys encrypted at rest).

## License

MIT
