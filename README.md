# Silicon Valley Builder (SVB)

**Self-hostable AI App Builder** — open-source analog of Lovable + Bolt.new with Admin panel, Stripe, MCP, Git integrations, SEO & AI Search and WebContainers.

Prompt → full-stack React + TypeScript + Tailwind app → WebContainers live preview → Git push → SEO audit → deploy.

**Ready product**, not a demo skeleton.

## Features

- **AI Builder** — multi-model (OpenAI, Anthropic, xAI/Grok, Groq, DeepSeek, Ollama, any OpenAI-compatible)
- **Admin panel** — connect LLMs via API keys (encrypted), priorities
- **Stripe** — Free / Pro / Team, Checkout + Customer Portal + webhooks
- **WebContainers** — real Node.js sandbox in the browser
- **MCP** — Model Context Protocol support
- **Git** — GitHub, GitLab, Bitbucket OAuth + push
- **SEO & AI Search** — audit, AI visibility score
- **i18n** — RU / EN / BG / ZH / ES / FR / IT
- **Self-host** — Docker Compose on any VDS

## Multi-turn like Lovable / Bolt

- **Chat** — dialogue with project file context
- **Continue coding** — AI edits existing files (not from scratch)
- **Fix (self-heal)** — paste error → AI patches code
- Message history + current files are sent on every iteration

## Billing

`/billing` — Free / Pro / Team plans, Stripe Checkout and Customer Portal.

## Git OAuth UI

`/settings/git` — connect GitHub, GitLab, Bitbucket, list repos, select target for **Push to Git** in Builder.

## Quick start (local)

```bash
git clone https://github.com/zametkikostik/Silicon-Valley-Builder.git
cd Silicon-Valley-Builder
cp .env.example .env
# set NEXTAUTH_SECRET + at least one LLM key (+ Stripe / Git OAuth as needed)

docker compose up -d
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000

## Install on VDS (Ubuntu 22.04 / 24.04)

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

git clone https://github.com/zametkikostik/Silicon-Valley-Builder.git
cd Silicon-Valley-Builder
cp .env.example .env && nano .env   # set DOMAIN, secrets, LLM keys

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

Caddy obtains Let's Encrypt when `DOMAIN` is set.

### Important .env keys

```env
DATABASE_URL=postgresql://svb:svb_secret@db:5432/svb?schema=public
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=...
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=...
OPENAI_API_KEY=   # or ANTHROPIC / GROQ / XAI
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
GITHUB_ID= / GITHUB_SECRET=
GITLAB_CLIENT_ID= / GITLAB_CLIENT_SECRET=
BITBUCKET_CLIENT_ID= / BITBUCKET_CLIENT_SECRET=
ENCRYPTION_KEY=
DOMAIN=your-domain.com
```

## Admin

Sign in with seed admin → `/admin` → add LLM provider API keys.

## How the AI Builder works

1. Create project, write prompt
2. **Generate App** or **Continue coding** (multi-turn)
3. **Chat** for planning with file context
4. **Fix** for self-heal on errors
5. WebContainers preview
6. **Push to Git** after selecting repo in Settings → Git
7. SEO tab for discoverability score

## License

MIT
