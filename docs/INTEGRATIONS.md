# Integrações do InyffX

## Estado atual

| Integração | Estado | O que falta |
| --- | --- | --- |
| Interface e memória local | Funcional | Nada para testar no mesmo navegador |
| Modelo de partida → SEASONS/FYX NEWS | Funcional | Nada; usa somente os fatos preenchidos |
| Spotify — faixa atual | Front-end funcional | Client ID e Redirect URI cadastrada |
| IA de roleplay | Contrato pronto, não conectada | Backend seguro e escolha do modelo |
| Banco multiusuário | Não conectado | Serviço, esquema, autenticação e migrações |
| Upload/análise de screenshots | Não conectado | Object storage e endpoint multimodal |
| Publicação GitHub | Workflow pronto | Repositório remoto/autorização da conta |

## IA e banco de dados

O navegador nunca deve chamar uma API de IA usando uma chave privada publicada no JavaScript. A configuração **URL do backend** espera um serviço próprio, serverless ou tradicional, que mantenha as credenciais no servidor.

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

O backend é responsável por autenticar o usuário, consultar a memória objetiva, selecionar o contexto relevante, chamar o modelo e persistir a transação.

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

`assets/config.js` pode conter somente valores públicos:

```js
window.INYFFX_CONFIG = Object.freeze({
  apiBaseUrl: "https://api.seudominio.com",
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

O provedor de IA e o serviço de banco ainda precisam ser escolhidos antes da implementação do backend, pois essa decisão afeta autenticação, custo, hospedagem e migrações.
