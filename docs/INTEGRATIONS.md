# Integrações do InyffX

## Estado atual

| Integração | Estado | O que falta |
| --- | --- | --- |
| Interface e memória local | Funcional | Nada para testar no mesmo navegador |
| Modelo de partida → SEASONS/FYX NEWS | Funcional | Nada; usa somente os fatos preenchidos |
| Spotify — faixa atual | Front-end funcional | Client ID e Redirect URI cadastrada |
| IA de roleplay | Backend implementado | Login e primeiro deploy na Cloudflare |
| Banco multiusuário | Não conectado | Serviço, esquema, autenticação e migrações |
| Upload/análise de screenshots | Não conectado | Object storage e endpoint multimodal |
| Publicação GitHub | Workflow pronto | Repositório remoto/autorização da conta |

## IA gratuita do MVP

O backend está em `backend/` e usa:

- Cloudflare Workers no plano Free para o endpoint serverless;
- Workers AI por binding, sem API key exposta nem chave para o jogador;
- `@cf/zai-org/glm-4.7-flash`, escolhido para diálogo multilíngue, instruções e contexto longo;
- JSON estruturado para separar a narração das atualizações de memória;
- CORS restrito, validação de tamanho, timeout no navegador e rate limiting por carreira e IP;
- adaptador isolado em `backend/src/provider.js`, ponto único para a futura troca por OpenAI ou outro provedor.

Segundo a documentação da Cloudflare consultada em 26/08/2026, Workers AI oferece 10.000 Neurons por dia sem cobrança no plano Free. Ao esgotar a franquia, novas inferências falham até a renovação diária; o frontend mantém a mensagem do jogador salva.

O endereço do Worker é uma configuração pública do próprio InyffX. Ele não aparece como campo editável para usuários.

### Primeiro deploy

```powershell
cd backend
npm install
node --test tests/worker.test.js
npx wrangler login
npm run deploy
```

Depois, copie somente a URL `workers.dev` retornada para `assets/config.js` e publique o frontend novamente. Nenhum token da Cloudflare entra no repositório.

## IA e banco de dados

O navegador nunca deve chamar uma API de IA usando uma chave privada publicada no JavaScript. O InyffX chama o Worker oficial configurado pelo proprietário do site; o usuário final não escolhe provedor nem informa credenciais.

### Requisição implementada

```http
POST {API_BASE_URL}/v1/roleplay/message
Content-Type: application/json
```

```json
{
  "schemaVersion": "1.0",
  "careerId": "career-uuid",
  "message": {
    "id": "message-uuid",
    "content": "Entro na sala e cumprimento o treinador.",
    "scene": 2,
    "createdAt": "2026-08-26T18:00:00.000Z"
  },
  "context": {
    "profile": {},
    "scene": 2,
    "recentMessages": [],
    "retrievalRequest": {
      "includeRelevantCharacters": true,
      "includeRecentCanon": true,
      "includeCurrentSeason": true,
      "includeSecretsByKnowledgeScope": true
    }
  }
}
```

No MVP, o backend valida a requisição, seleciona o contexto relevante, chama o modelo e devolve atualizações estruturadas. A persistência continua local até a fase de autenticação e banco multiusuário.

### Resposta aceita pelo front-end

```json
{
  "message": {
    "id": "message-uuid",
    "content": "O treinador fecha o tablet e olha para você...",
    "createdAt": "2026-08-26T18:00:02.000Z"
  },
  "memoryUpdates": {
    "canonEvents": [],
    "news": [],
    "characters": [],
    "seasons": [
      {
        "label": "2026/27",
        "matches": []
      }
    ],
    "finance": {
      "currency": "EUR",
      "balance": 0,
      "transactions": [],
      "pockets": []
    },
    "hall": {
      "trophies": [],
      "records": [],
      "awards": []
    },
    "calendar": [],
    "offPitch": {
      "currentCity": "",
      "currentResidence": "",
      "houses": []
    }
  }
}
```

Itens estruturados devem ter um `id` estável para serem atualizados sem duplicação. O backend também deve validar que um NPC só recebe fatos e segredos dentro do próprio escopo de conhecimento.

### Cabeçalhos e CORS

O backend precisa aceitar a origem exata do GitHub Pages e, no desenvolvimento, `http://127.0.0.1:4173`. Em produção, use autenticação real e envie o token em cabeçalho; não dependa do `careerId` como autorização.

## Spotify

O InyffX usa Authorization Code com PKCE. Nenhum Client Secret é necessário no navegador.

1. Crie um app no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Abra o InyffX em sua URL final.
3. Entre em **Configurações → Spotify**.
4. Copie exatamente a **Redirect URI** exibida.
5. Adicione essa URI às Redirect URIs do app no painel do Spotify e salve.
6. Copie o **Client ID** público para o campo do InyffX.
7. Clique em **Conectar Spotify** e autorize os escopos de leitura da reprodução.

Para testar localmente, cadastre `http://127.0.0.1:4173/`. Para o GitHub Pages, cadastre a URL publicada com a barra final e o caminho do repositório, por exemplo `https://usuario.github.io/inyffx/`.

Os tokens ficam em `sessionStorage`: fechar a sessão do navegador exige uma nova conexão. O disco mostra capa, música, artista e estado da reprodução; ele não controla o player.

## Configuração pública opcional

`assets/config.js` pode conter somente valores públicos definidos pelo InyffX:

```js
window.INYFFX_CONFIG = Object.freeze({
  apiBaseUrl: "https://inyffx-api.seu-subdominio.workers.dev",
  aiProvider: "Cloudflare Workers AI",
  aiModel: "GLM-4.7-Flash",
  spotifyClientId: "client_id_publico"
});
```

Nunca inclua neste arquivo:

- API key de modelo de IA;
- senha ou service role do banco;
- JWT secret;
- Spotify Client Secret;
- cookies ou tokens pessoais.

## Arquitetura recomendada para a próxima fase

```text
GitHub Pages (interface)
        │
        ▼
Backend autenticado / API
   ├── banco relacional: fatos, cenas, relações, temporadas
   ├── busca de contexto: apenas memória relevante
   ├── object storage: screenshots
   ├── orquestrador de IA: narração + atualizações estruturadas
   └── auditoria: origem, certeza e escopo de conhecimento
```

O provedor do MVP já está abstraído. A próxima fase é adicionar autenticação real e banco relacional sem transferir à IA a responsabilidade de ser a memória objetiva.
