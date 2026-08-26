# InyffX

> Sua carreira. Seu universo.

Demo navegável de uma plataforma de roleplay para modos carreira de futebol. O videogame continua responsável pelo futebol; o InyffX dá continuidade ao mundo que existe ao redor das partidas.

## Demo v1.0

Esta primeira versão é uma experiência de produto inteiramente estática e compatível com GitHub Pages. Ela demonstra:

- dashboard da carreira e próximo jogo;
- criação de protagonista e configuração da profundidade narrativa;
- chat de roleplay com proteção explícita da agência do jogador;
- registro pós-jogo com placar, desempenho e descrição dos gols;
- repercussão fictícia com manchete, torcida, mensagem e coletiva;
- separação visual entre fato do jogo, fato do RP, segredo e possibilidade;
- linha do tempo do cânone e mapa conceitual de memória;
- fichas de NPCs com confiança, respeito, tensão, razões e conhecimento;
- mídia fictícia, redes sociais, calendário, finanças e hall da carreira;
- acontecimentos aleatórios com D6 e D20;
- trilha de carreira demonstrativa e fluxo futuro de Spotify;
- persistência local e exportação do save em JSON;
- temas claro/escuro e layout responsivo para desktop e celular.

## Executar localmente

Não há instalação, build ou dependências de produção.

1. Abra `index.html` diretamente; ou
2. sirva a pasta com qualquer servidor estático:

```powershell
python -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Publicar no GitHub Pages

O workflow em `.github/workflows/pages.yml` publica a raiz do repositório sempre que houver push para `main`.

1. Crie ou conecte um repositório GitHub.
2. Envie a branch `main`.
3. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
4. Aguarde a execução de **Deploy InyffX to GitHub Pages**.

Como a aplicação usa rotas por hash (`#/roleplay`, `#/canon`), todas as telas funcionam em subpastas do GitHub Pages sem regras especiais de redirecionamento.

## Filosofia técnica

**A IA não é o banco de dados.** O banco de dados é a memória objetiva; a IA é a narradora e intérprete dessa memória.

Uma versão de produção deve recuperar apenas o contexto relevante para cada cena. Exemplo:

```text
cena atual
  ├─ protagonista e estado da carreira
  ├─ NPCs presentes e respectivas memórias
  ├─ relação entre os participantes e suas razões
  ├─ últimos eventos relevantes
  ├─ fatos públicos conhecidos
  └─ segredos que cada participante pode acessar
```

Entidades sugeridas para o backend:

| Entidade | Responsabilidade |
| --- | --- |
| `careers` | universo, tom, módulos e save ativo |
| `players` | protagonista e características objetivas |
| `seasons` / `matches` | calendário, estatísticas e fatos do jogo |
| `characters` | identidade, personalidade e objetivos dos NPCs |
| `relationships` | estado atual e razões históricas da relação |
| `canon_events` | acontecimentos confirmados e respectivas fontes |
| `knowledge_edges` | quem sabe cada fato, desde quando e por qual fonte |
| `scenes` / `messages` | sessões narrativas e falas em ordem |
| `contracts` / `assets` | finanças, patrimônio e objetos importantes |
| `media_items` | notícias, posts, coletivas e repercussões |

## Limites desta demo

GitHub Pages hospeda somente arquivos públicos e estáticos. Por isso, esta versão:

- simula respostas narrativas com ramificações locais;
- não contém chave de API nem chama um modelo de IA;
- usa `localStorage`, não um banco multiusuário;
- não possui login, sincronização entre dispositivos ou colaboração;
- apresenta Spotify e análise de screenshots como fluxos de produto, sem conexão real.

API keys nunca devem ser colocadas no JavaScript publicado. A versão completa precisará de um backend seguro para autenticação, banco de dados, armazenamento de imagens, orquestração da memória e chamadas à IA.

## Próxima fase recomendada

1. autenticação e múltiplas carreiras por usuário;
2. banco relacional com eventos canônicos e grafo de conhecimento;
3. serviço de recuperação de contexto por cena;
4. chat em streaming com ferramentas estruturadas para atualizar o cânone;
5. uploads e análise de screenshots;
6. calendário, finanças e NPCs totalmente editáveis;
7. integrações opcionais com Spotify e relatórios do The Sims;
8. testes de contradição, custo e segurança narrativa.

---

InyffX é um conceito independente e não é afiliado a EA, EA Sports FC, Konami, eFootball, PES, clubes, ligas ou veículos de mídia citados pelo usuário. As marcas de mídia exibidas na demo são fictícias.
