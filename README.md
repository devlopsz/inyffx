# InyffX

> O futebol acontece no jogo. A vida acontece aqui.

Interface web para transformar um modo carreira de jogador em um universo persistente de roleplay. O jogo de futebol determina partidas e estatísticas; o InyffX organiza o cânone e cria a camada narrativa ao redor delas.

## Interface atual

Esta versão é um front-end estático compatível com GitHub Pages. Ela contém:

- cadastro em quatro etapas e login de carreiras salvas no navegador;
- estado inicial vazio: nenhum personagem, jogo, notícia, conquista ou compromisso é inventado;
- hub minimalista com fundo personalizável e todas as fontes em Cruyff Sans;
- `KICK OFF`: chat de RP, modelo de partida, roleta editável e dados D6, D8, D10, D12, D20 e D100;
- `FYX NEWS`: manchetes, redes sociais, análises e fofocas em modo consulta;
- `RELATIONSHIPS`: fichas de todos os personagens confirmados no cânone;
- `SEASONS`: partidas narradas e estatísticas agregadas por temporada;
- `PLAYER CAREER`: FYX Pay, Hall da carreira e calendário;
- `OFF THE PITCH`: fluxo opcional para The Sims 4, modelo copiável e moradias;
- atualização local de `SEASONS` e `FYX NEWS` quando um modelo de partida preenchido é enviado;
- integração Spotify por Authorization Code com PKCE, pronta para receber um Client ID;
- IA gratuita do MVP preparada em Cloudflare Workers AI, sem chave ou endpoint configurado pelo jogador;
- contrato de API e adaptador de provedor separados para trocar o modelo futuramente sem refazer a interface.

## Executar localmente

Não há build nem dependências de produção. Sirva a pasta por HTTP para que recursos como OAuth e Clipboard funcionem corretamente:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Abra `http://127.0.0.1:4173/`.

Também é possível abrir `index.html` diretamente para conferir o layout, mas a conexão Spotify não funciona em uma URL `file://`.

## Publicar no GitHub Pages

O workflow em `.github/workflows/pages.yml` publica a raiz do repositório a cada push para `main`.

1. Conecte esta pasta a um repositório GitHub.
2. Envie a branch `main`.
3. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**.
4. Aguarde o workflow **Deploy InyffX to GitHub Pages**.

As páginas usam rotas por hash, como `#kick-off` e `#fyx-news`, portanto funcionam em subpastas do GitHub Pages sem redirecionamentos especiais.

## Integrações

As instruções completas e o contrato JSON estão em [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

Resumo:

- **IA do MVP:** o backend em `backend/` usa Cloudflare Workers AI com `@cf/zai-org/glm-4.7-flash`. O jogador não informa chave nem URL; o endereço público do Worker é definido uma vez pelo InyffX em `assets/config.js`.
- **Banco multiusuário:** ainda não conectado. A memória estruturada continua no navegador nesta fase e já é enviada de forma seletiva ao backend.
- **Spotify:** o fluxo PKCE está implementado. É necessário criar um app no Spotify Developer Dashboard, registrar a Redirect URI exibida pelo InyffX e colar o Client ID público.
- **GitHub Pages:** nunca armazene uma chave OpenAI, senha de banco, service role ou Spotify Client Secret em `assets/config.js`.

## Backend gratuito de IA

```powershell
cd backend
npm install
node --test tests/worker.test.js
npx wrangler deploy --dry-run
```

O primeiro deploy exige apenas uma conta Cloudflare no plano Free e `npx wrangler login`. O binding `AI` autentica o Worker sem publicar uma API key. Consulte [backend/README.md](backend/README.md) para o procedimento completo.

## Filosofia técnica

**A IA não é o banco de dados.** O banco é a memória objetiva; a IA é a narradora e intérprete dessa memória.

O backend deve recuperar apenas o contexto necessário à cena atual e devolver, separadamente:

1. a fala narrativa da IA;
2. atualizações estruturadas de memória;
3. o escopo de conhecimento de cada personagem;
4. fatos confirmados, possibilidades e segredos sem misturá-los.

## Persistência desta versão

- A carreira e o fundo personalizado usam `localStorage`.
- A sessão de login e os tokens Spotify usam `sessionStorage`.
- O código de acesso local é salvo como hash SHA-256; ele serve apenas para a experiência da interface e não substitui autenticação de produção.
- Limpar os dados do navegador remove as carreiras locais.
- Sincronização entre dispositivos dependerá do backend.
- A IA gratuita tem franquia diária e pode ficar indisponível até a renovação da cota; mensagens do jogador permanecem salvas localmente nesses casos.

## Teste automatizado

O teste em `tests/smoke.cjs` cobre cadastro, estado vazio, KICK OFF, modelo de partida, atualização de SEASONS/FYX NEWS e responsividade.

```powershell
node tests/smoke.cjs
```

---

InyffX é um conceito independente e não é afiliado à Electronic Arts, EA SPORTS FC, Konami, eFootball, PES, The Sims, Spotify, clubes, ligas ou veículos de mídia.
