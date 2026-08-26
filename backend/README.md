# Backend de IA do InyffX

Worker serverless do MVP. Ele recebe o contrato já usado pelo `KICK OFF`, chama o Cloudflare Workers AI e devolve a narração separada das atualizações estruturadas de memória.

## Escolha do MVP

- provedor: Cloudflare Workers AI;
- modelo inicial: `@cf/zai-org/glm-4.7-flash`;
- plano: Workers Free, sem cartão obrigatório;
- autenticação entre Worker e modelo: binding `AI`, sem API key no JavaScript;
- proteção: CORS restrito, validação de entrada, limite por carreira e IP, tamanho máximo e teto de saída;
- troca futura: a chamada do provedor está isolada em `src/provider.js`.

O nível gratuito possui franquia diária. Quando ela termina, o endpoint responde `FREE_TIER_UNAVAILABLE` e o frontend preserva a mensagem do jogador para tentar novamente depois.

## Desenvolvimento

```powershell
cd backend
npm install
npm test
npm run check
```

`npm run dev` usa o binding remoto do Workers AI e exige login na Cloudflare.

## Primeiro deploy

```powershell
cd backend
npx wrangler login
npm run deploy
```

O comando final informa uma URL `https://inyffx-api.<subdominio>.workers.dev`. Essa URL é pública e deve ser copiada para `assets/config.js`; nenhuma credencial deve ser copiada para o frontend.

Depois do deploy, valide:

```powershell
Invoke-RestMethod https://inyffx-api.<subdominio>.workers.dev/health
```

## Contrato

```http
POST /v1/roleplay/message
Content-Type: application/json
Origin: https://devlopsz.github.io
```

O contrato completo permanece documentado em `../docs/INTEGRATIONS.md`.

## Limites do MVP

- A carreira continua persistida no navegador; sincronização real entre dispositivos virá com autenticação e banco multiusuário.
- CORS e rate limiting reduzem abuso, mas não substituem contas reais de usuário.
- A franquia gratuita não oferece garantia de disponibilidade para produção.
