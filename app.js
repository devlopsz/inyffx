/*
 * InyffX — initial release demo v1.0
 * Static product prototype: no API keys, external accounts or backend required.
 */

(() => {
  "use strict";

  const STORAGE_KEY = "inyffx-demo-v1";
  const ROUTES = ["home", "roleplay", "postgame", "canon", "characters", "universe"];

  const DEFAULT_STATE = {
    version: 1,
    theme: "dark",
    settings: {
      soundtrackVisible: true,
      soundtrackPlaying: false,
    },
    career: {
      name: "Caio Alexandre",
      age: 20,
      nationality: "Brasil",
      position: "MEI",
      shirt: 17,
      dominantFoot: "Direito",
      club: "Chelsea",
      formerClub: "Flamengo",
      season: "2026/27",
      game: "EA FC",
      archetype: "Criador decisivo",
      personality: "Ambicioso, leal e competitivo",
      origin: "Criado no Rio de Janeiro, transformou a pressão da base em combustível para chegar à Europa.",
      objective: "Conquistar a Champions League e se tornar referência da Seleção Brasileira.",
      depth: "cinematic",
      modules: ["vida", "midia", "relacoes", "financas", "sorte"],
    },
    stats: {
      appearances: 17,
      goals: 12,
      assists: 9,
      rating: 8.1,
      reputation: 74,
      energy: 82,
      canonFacts: 148,
      rpEvents: 93,
      characters: 21,
      secrets: 7,
    },
    nextMatch: {
      opponent: "Napoli",
      competition: "UEFA Champions League",
      date: "29 AGO",
      time: "20:45",
      venue: "Stadio Diego Armando Maradona",
      leg: "Fase de liga · Rodada 1",
    },
    missions: [
      { id: "m1", title: "Revisar o plano para Napoli", detail: "Converse com o treinador antes da viagem", xp: 120, done: false },
      { id: "m2", title: "Responder Rafael", detail: "Há uma atualização sobre seu novo contrato", xp: 80, done: false },
      { id: "m3", title: "Sessão de recuperação", detail: "Centro médico · 17h30", xp: 60, done: true },
      { id: "m4", title: "Noite livre", detail: "Escolha como Caio vai usar o tempo", xp: 40, done: false },
    ],
    inbox: [
      { id: "i1", initials: "LD", color: "#337ea0", name: "Leo Duarte", preview: "O grupo marcou jantar depois do treino...", time: "agora", unread: true },
      { id: "i2", initials: "RN", color: "#8a6440", name: "Rafael Nunes", preview: "Londres quer uma resposta até sexta.", time: "12 min", unread: true },
      { id: "i3", initials: "MS", color: "#82527c", name: "Maya Silva", preview: "Posso publicar sua fala sobre a torcida?", time: "1 h", unread: true },
      { id: "i4", initials: "VH", color: "#53645a", name: "Viktor Hale", preview: "Sala de vídeo. Amanhã, 8h.", time: "3 h", unread: false },
    ],
    chat: [
      {
        id: "c1",
        type: "narration",
        text: "O centro de treinamento já está quase vazio. A chuva risca os vidros da sala de vídeo, e o ruído distante dos jardineiros ocupa o silêncio. Viktor Hale fecha o notebook quando Caio entra.",
      },
      {
        id: "c2",
        type: "npc",
        speaker: "Viktor Hale",
        role: "Treinador",
        initials: "VH",
        color: "#53645a",
        time: "22:14",
        text: "Fecha a porta, Caio. Quero falar de Nápoles — e não apenas do que vai acontecer com a bola.",
      },
      {
        id: "c3",
        type: "user",
        speaker: "Você · Caio",
        initials: "CA",
        color: "#337ea0",
        time: "22:15",
        text: "Claro, professor. Aconteceu alguma coisa?",
      },
      {
        id: "c4",
        type: "npc",
        speaker: "Viktor Hale",
        role: "Treinador",
        initials: "VH",
        color: "#53645a",
        time: "22:15",
        text: "O estádio vai tentar te engolir. Depois do que você fez contra o Liverpool, todos vão esperar que resolva sozinho. Quero saber se está preparado para jogar com essa expectativa — sem deixar que ela jogue por você.",
      },
    ],
    timeline: [
      {
        id: "e1",
        day: "26",
        month: "ago",
        season: "Temporada 2026/27",
        kind: "rp",
        category: "Relações",
        title: "Conversa reservada com Viktor Hale",
        description: "O treinador chamou Caio após o treino para falar sobre pressão, liderança e a viagem a Nápoles.",
        people: ["VH", "CA"],
      },
      {
        id: "e2",
        day: "24",
        month: "ago",
        season: "Temporada 2026/27",
        kind: "game",
        category: "Partida",
        title: "Chelsea 3 × 2 Liverpool",
        description: "Caio marcou duas vezes, incluindo o gol da vitória aos 90 minutos. Nota registrada: 9,2.",
        people: ["CA"],
      },
      {
        id: "e3",
        day: "23",
        month: "ago",
        season: "Temporada 2026/27",
        kind: "secret",
        category: "Segredo",
        title: "Rafael recebeu uma sondagem confidencial",
        description: "Somente Caio e seu empresário sabem que um clube espanhol pediu condições para uma futura negociação.",
        people: ["RN", "CA"],
      },
      {
        id: "e4",
        day: "18",
        month: "ago",
        season: "Temporada 2026/27",
        kind: "rp",
        category: "Vida pessoal",
        title: "Jantar no apartamento de Leo",
        description: "Uma conversa honesta transformou a parceria de campo em amizade fora dele.",
        people: ["LD", "CA"],
      },
      {
        id: "e5",
        day: "12",
        month: "ago",
        season: "Temporada 2026/27",
        kind: "possible",
        category: "Possibilidade",
        title: "Convite para campanha internacional",
        description: "A equipe de Rafael avalia a proposta. Nada foi aceito e o evento ainda não é cânone.",
        people: ["RN"],
      },
      {
        id: "e6",
        day: "06",
        month: "jun",
        season: "Temporada 2025/26",
        kind: "game",
        category: "Carreira",
        title: "Assinatura com o Chelsea",
        description: "Transferência concluída após a temporada de estreia no Flamengo. Contrato de cinco anos.",
        people: ["CA", "RN"],
      },
    ],
    characters: [
      {
        id: "leo",
        name: "Leo Duarte",
        role: "Companheiro de equipe · Ponta",
        relation: "Melhor amigo",
        trust: 88,
        respect: 84,
        tension: 8,
        initials: "LD",
        color: "#337ea0",
        traits: "Espontâneo, protetor e irônico. Usa humor para aliviar a pressão.",
        reason: "A amizade cresceu depois que Leo protegeu Caio durante uma crise no vestiário.",
        lastEvent: "Convidou Caio para um jantar com o grupo antes da viagem.",
        knows: ["Sondagem espanhola", "Discussão no vestiário"],
        secret: "Não sabe que Caio ainda considera ouvir a proposta.",
      },
      {
        id: "viktor",
        name: "Viktor Hale",
        role: "Treinador principal",
        relation: "Mentor exigente",
        trust: 76,
        respect: 91,
        tension: 31,
        initials: "VH",
        color: "#53645a",
        traits: "Metódico, reservado e obcecado por responsabilidade coletiva.",
        reason: "Confia no talento de Caio, mas testa sua maturidade nos momentos de maior exposição.",
        lastEvent: "Chamou Caio para uma conversa privada sobre o jogo em Nápoles.",
        knows: ["Cláusulas do contrato", "Pressão da diretoria"],
        secret: "Não conhece a sondagem espanhola recebida por Rafael.",
      },
      {
        id: "rafael",
        name: "Rafael Nunes",
        role: "Empresário",
        relation: "Aliado estratégico",
        trust: 82,
        respect: 72,
        tension: 23,
        initials: "RN",
        color: "#8a6440",
        traits: "Persuasivo, calculista e genuinamente leal quando não há câmeras.",
        reason: "Conduziu a ida para Londres, mas sua pressa por grandes acordos gera atrito.",
        lastEvent: "Pediu uma resposta sobre a renovação comercial até sexta-feira.",
        knows: ["Sondagem espanhola", "Patrimônio", "Plano de carreira"],
        secret: "Ainda não contou que a proposta publicitária exige exclusividade.",
      },
      {
        id: "maya",
        name: "Maya Silva",
        role: "Jornalista · Touchline",
        relation: "Respeito cauteloso",
        trust: 59,
        respect: 78,
        tension: 42,
        initials: "MS",
        color: "#82527c",
        traits: "Perspicaz, direta e paciente. Percebe contradições rapidamente.",
        reason: "Caio foi honesto numa entrevista difícil, mas ela não abre mão de perguntas incômodas.",
        lastEvent: "Pediu autorização para publicar uma fala sobre a torcida.",
        knows: ["Incômodo com a imprensa", "Amizade com Leo"],
        secret: "Não sabe nada sobre a sondagem ou a negociação comercial.",
      },
      {
        id: "dante",
        name: "Dante Moretti",
        role: "Rival · Napoli",
        relation: "Rivalidade pública",
        trust: 14,
        respect: 67,
        tension: 86,
        initials: "DM",
        color: "#5a65a0",
        traits: "Provocador, carismático e muito consciente da própria imagem.",
        reason: "A rivalidade começou após uma provocação em jogo de seleções e cresceu nas redes.",
        lastEvent: "Curtiu um post dizendo que Caio desaparece fora de casa.",
        knows: ["Declarações públicas", "Números da temporada"],
        secret: "Só conhece a persona pública de Caio.",
      },
      {
        id: "ana",
        name: "Ana Alexandre",
        role: "Irmã mais velha",
        relation: "Porto seguro",
        trust: 96,
        respect: 89,
        tension: 5,
        initials: "AA",
        color: "#8b5a61",
        traits: "Prática, afetuosa e imune à fama do irmão.",
        reason: "Foi quem acompanhou Caio nos primeiros testes e ainda é sua voz de realidade.",
        lastEvent: "Ligou para saber se ele está dormindo bem antes da Champions.",
        knows: ["História completa", "Sondagem espanhola", "Medos pessoais"],
        secret: "É uma das poucas pessoas que conhece a dimensão real da pressão.",
      },
    ],
    lastStoryPack: null,
    chanceEvents: [],
  };

  const ui = {
    route: getRouteFromHash(),
    canonFilter: "all",
    canonSearch: "",
    universeTab: "social",
    selectedCharacter: "viktor",
    goalEntries: [
      { minute: 31, detail: "Corte da direita para o centro e finalização rasteira no canto." },
      { minute: 90, detail: "Rebote na entrada da área e chute de primeira para virar o jogo." },
    ],
    postgameDraft: {
      competition: "Premier League",
      homeClub: "Chelsea",
      awayClub: "Liverpool",
      homeScore: 3,
      awayScore: 2,
      goals: 2,
      assists: 0,
      rating: 9.2,
      minutes: 90,
      cards: "Nenhum",
      injury: "Não",
      notes: "Gol da vitória aos 90 minutos. A torcida cantou o nome de Caio após o apito final.",
    },
    dieSides: 20,
    roll: null,
    rollEvent: null,
    typing: false,
    wizardStep: 1,
    draftCareer: null,
  };

  let state = loadState();
  const main = document.querySelector("#mainContent");
  const modalRoot = document.querySelector("#modalRoot");
  const toastRegion = document.querySelector("#toastRegion");

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== DEFAULT_STATE.version) return clone(DEFAULT_STATE);
      return {
        ...clone(DEFAULT_STATE),
        ...saved,
        settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
        career: { ...DEFAULT_STATE.career, ...(saved.career || {}) },
        stats: { ...DEFAULT_STATE.stats, ...(saved.stats || {}) },
      };
    } catch {
      return clone(DEFAULT_STATE);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getRouteFromHash() {
    const candidate = window.location.hash.replace(/^#\/?/, "").split("?")[0];
    return ROUTES.includes(candidate) ? candidate : "home";
  }

  function icon(name, className = "") {
    return `<svg${className ? ` class="${className}"` : ""} aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function initials(name) {
    return String(name || "IX")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function avatar(data, size = "") {
    return `<span class="avatar ${size}" style="background:linear-gradient(145deg,${escapeHTML(data.color || "#337ea0")},#172521)">${escapeHTML(data.initials || initials(data.name))}</span>`;
  }

  function tagFor(kind) {
    const tags = {
      game: ["game", "Fato do jogo"],
      rp: ["rp", "Fato do RP"],
      possible: ["possible", "Possibilidade"],
      secret: ["secret", "Segredo"],
    };
    const [className, label] = tags[kind] || tags.rp;
    return `<span class="tag tag-${className}">${label}</span>`;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function updateChrome() {
    document.documentElement.dataset.theme = state.theme;
    document.querySelector("meta[name='theme-color']").content = state.theme === "dark" ? "#07100f" : "#f2f5ef";
    document.querySelector("#careerSwitcherText").textContent = `${state.career.name} · ${state.career.club}`;
    document.querySelectorAll(".avatar-caio").forEach((el) => {
      el.textContent = initials(state.career.name);
    });
    document.querySelectorAll("[data-route]").forEach((button) => {
      button.classList.toggle("active", button.dataset.route === ui.route);
    });
    const soundtrack = document.querySelector("#soundtrack");
    soundtrack.classList.toggle("closed", !state.settings.soundtrackVisible);
    soundtrack.classList.toggle("playing", state.settings.soundtrackPlaying);
    const soundButton = soundtrack.querySelector(".soundtrack-play");
    soundButton.setAttribute("aria-label", state.settings.soundtrackPlaying ? "Pausar trilha" : "Reproduzir trilha");
  }

  function navigate(route) {
    if (!ROUTES.includes(route)) route = "home";
    closeMenus();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (getRouteFromHash() === route) {
      ui.route = route;
      render();
    } else {
      window.location.hash = `#/${route}`;
    }
  }

  function render() {
    ui.route = getRouteFromHash();
    const renderers = {
      home: renderHome,
      roleplay: renderRoleplay,
      postgame: renderPostgame,
      canon: renderCanon,
      characters: renderCharacters,
      universe: renderUniverse,
    };
    main.innerHTML = renderers[ui.route]();
    document.title = `${routeLabel(ui.route)} · InyffX`;
    updateChrome();
    requestAnimationFrame(() => {
      if (ui.route === "roleplay") scrollChat();
    });
  }

  function routeLabel(route) {
    return {
      home: "Início",
      roleplay: "Roleplay",
      postgame: "Pós-jogo",
      canon: "Cânone",
      characters: "Personagens",
      universe: "Universo",
    }[route];
  }

  function showToast(title, message = "", type = "check") {
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `
      <span class="toast-icon">${icon(type)}</span>
      <span><strong>${escapeHTML(title)}</strong>${message ? `<span>${escapeHTML(message)}</span>` : ""}</span>
      <button class="icon-button" type="button" data-action="dismiss-toast" aria-label="Fechar">${icon("close")}</button>
    `;
    toastRegion.append(node);
    window.setTimeout(() => node.remove(), 4300);
  }

  function closeMenus() {
    document.querySelectorAll(".menu-popover").forEach((menu) => menu.remove());
  }

  function closeModal() {
    modalRoot.innerHTML = "";
  }

  function renderHome() {
    const c = state.career;
    const s = state.stats;
    const completed = state.missions.filter((mission) => mission.done).length;
    return `
      <div class="page home-page">
        <section class="home-hero">
          <div class="hero-copy">
            <span class="eyebrow">Temporada ${escapeHTML(c.season)}</span>
            <h1>Boa noite, ${escapeHTML(c.name.split(" ")[0])}.<br><em>Seu mundo continua.</em></h1>
            <p>Há 3 acontecimentos pendentes desde sua última cena. A imprensa ainda repercute o jogo contra o Liverpool, e Viktor quer falar antes da viagem.</p>
            <div class="hero-actions">
              <button class="button button-primary" type="button" data-route="roleplay">Continuar roleplay ${icon("arrow")}</button>
              <button class="button button-ghost" type="button" data-route="postgame">Registrar partida</button>
            </div>
          </div>
          <div class="match-visual">
            <div class="pitch-orbit" aria-hidden="true"></div>
            <div class="next-match-card">
              <div class="next-match-top"><span>Próximo jogo</span><span class="live-badge"><i></i>${escapeHTML(state.nextMatch.date)}</span></div>
              <div class="teams">
                <div class="team"><span class="team-badge">C</span><strong>${escapeHTML(c.club)}</strong></div>
                <span class="match-vs">VS</span>
                <div class="team"><span class="team-badge">N</span><strong>${escapeHTML(state.nextMatch.opponent)}</strong></div>
              </div>
              <div class="match-time"><strong>${escapeHTML(state.nextMatch.time)} · ${escapeHTML(state.nextMatch.competition)}</strong><span>${escapeHTML(state.nextMatch.venue)}</span></div>
            </div>
          </div>
        </section>

        <section class="metrics-grid" aria-label="Resumo da temporada">
          ${metricCard("Participações", s.appearances, "+3 este mês", 68)}
          ${metricCard("Gols", s.goals, "vice-artilheiro", 76)}
          ${metricCard("Assistências", s.assists, "+2 este mês", 59)}
          ${metricCard("Nota média", Number(s.rating).toFixed(1), "↑ 0,3", 81)}
        </section>

        <section class="dashboard-grid">
          <article class="card dashboard-card">
            <div class="card-header">
              <div><h2 class="card-title">Objetivos de hoje</h2><p class="card-subtitle">${completed} de ${state.missions.length} concluídos · ${state.missions.reduce((sum, item) => sum + (item.done ? item.xp : 0), 0)} XP</p></div>
              <button class="text-link" type="button" data-action="generate-mission">Gerar objetivo ${icon("spark")}</button>
            </div>
            <div class="mission-list">
              ${state.missions.map((mission) => `
                <div class="mission ${mission.done ? "done" : ""}">
                  <button class="mission-check" type="button" data-mission-id="${mission.id}" aria-label="${mission.done ? "Reabrir" : "Concluir"} objetivo">${icon("check")}</button>
                  <div class="mission-copy"><strong>${escapeHTML(mission.title)}</strong><span>${escapeHTML(mission.detail)}</span></div>
                  <span class="mission-xp">+${mission.xp} XP</span>
                </div>
              `).join("")}
            </div>
          </article>

          <article class="card dashboard-card">
            <div class="card-header">
              <div><h2 class="card-title">Mensagens</h2><p class="card-subtitle">3 conversas aguardam você</p></div>
              <button class="text-link" type="button" data-route="roleplay">Ver todas ${icon("arrow")}</button>
            </div>
            <div class="inbox-list">
              ${state.inbox.map((item) => `
                <button class="inbox-item ${item.unread ? "inbox-unread" : ""}" type="button" data-action="open-inbox" data-name="${escapeHTML(item.name)}">
                  ${avatar(item, "avatar-sm")}
                  <span class="inbox-copy"><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.preview)}</span></span>
                  <time>${escapeHTML(item.time)}</time>
                </button>
              `).join("")}
            </div>
          </article>

          <article class="card dashboard-card">
            <div class="card-header">
              <div><h2 class="card-title">Últimos no cânone</h2><p class="card-subtitle">Memória objetiva da carreira</p></div>
              <button class="text-link" type="button" data-route="canon">Linha do tempo ${icon("arrow")}</button>
            </div>
            <div class="timeline-compact">
              ${state.timeline.slice(0, 4).map((event) => `
                <div class="timeline-mini-item">
                  <div class="timeline-date"><strong>${escapeHTML(event.day)}</strong><span>${escapeHTML(event.month)}</span></div>
                  <div class="timeline-mini-copy"><strong>${escapeHTML(event.title)}</strong><p>${escapeHTML(event.category)} · ${event.kind === "game" ? "fato importado" : "memória atualizada"}</p></div>
                </div>
              `).join("")}
            </div>
          </article>
        </section>
      </div>
    `;
  }

  function metricCard(label, value, trend, percent) {
    return `
      <article class="card metric-card">
        <small>${escapeHTML(label)}</small>
        <div class="metric-value"><strong>${escapeHTML(value)}</strong><span>${escapeHTML(trend)}</span></div>
        <div class="metric-bar"><i style="width:${percent}%"></i></div>
      </article>
    `;
  }

  function renderRoleplay() {
    const coach = state.characters.find((character) => character.id === "viktor") || state.characters[0];
    const messages = state.chat.map(renderChatMessage).join("");
    return `
      <div class="page roleplay-page">
        <section class="roleplay-layout">
          <div class="scene-panel">
            <header class="scene-header">
              <div class="scene-title-wrap">
                <span class="scene-icon">${icon("message")}</span>
                <span><strong>Sala de vídeo · Cobham</strong><span>26 de agosto · 22:15 · Chuva fraca</span></span>
              </div>
              <div class="scene-controls">
                <span class="control-pill live"><i></i>Ao vivo</span>
                <button class="control-pill" type="button" data-action="save-scene">Salvar marco</button>
                <button class="icon-button" type="button" data-action="scene-options" aria-label="Opções da cena">${icon("more")}</button>
              </div>
            </header>
            <div class="agency-banner">${icon("lock")}<span><strong>Agência do jogador protegida:</strong> a IA controla o mundo; somente você controla ${escapeHTML(state.career.name.split(" ")[0])}.</span></div>
            <div class="chat-scroll" id="chatScroll">
              <div class="scene-marker">Cena 41 · Antes de Nápoles</div>
              ${messages}
              ${ui.typing ? renderTyping(coach) : ""}
            </div>
            <div class="composer-wrap">
              <div class="quick-prompts">
                <button class="quick-prompt" type="button" data-prompt="Perguntar o que ele espera de mim">Perguntar o que ele espera</button>
                <button class="quick-prompt" type="button" data-prompt="Dizer que estou pronto para a pressão">Dizer que estou pronto</button>
                <button class="quick-prompt" type="button" data-prompt="Mudar o assunto para a escalação">Falar da escalação</button>
              </div>
              <form class="composer" id="roleplayForm">
                <button class="icon-button" type="button" data-action="attach-image" aria-label="Anexar screenshot">${icon("image")}</button>
                <textarea id="rpInput" name="message" rows="1" maxlength="1200" placeholder="O que ${escapeHTML(state.career.name.split(" ")[0])} diz ou faz?"></textarea>
                <button class="icon-button send-button" type="submit" aria-label="Enviar resposta">${icon("send")}</button>
              </form>
              <p class="composer-note">Enter envia · Shift + Enter quebra a linha · suas ações viram cânone apenas quando confirmadas na cena</p>
            </div>
          </div>

          <aside class="context-panel" aria-label="Contexto recuperado pela memória">
            <div class="context-heading"><strong>Contexto recuperado</strong><span class="memory-health"><i></i>Memória íntegra</span></div>
            <article class="context-card">
              <div class="context-card-label"><span>Personagem em cena</span>${icon("users")}</div>
              <div class="context-person">${avatar(coach, "avatar-sm")}<span><strong>${escapeHTML(coach.name)}</strong><span>${escapeHTML(coach.relation)}</span></span></div>
              <div class="relation-meter"><i style="width:${coach.trust}%"></i></div>
              <div class="relation-caption"><span>Confiança ${coach.trust}</span><span>Respeito ${coach.respect}</span></div>
            </article>
            <article class="context-card">
              <div class="context-card-label"><span>Últimos fatos relevantes</span>${icon("timeline")}</div>
              <div class="memory-fact">Dois gols contra o Liverpool; vitória aos 90'.</div>
              <div class="memory-fact">Viktor cobrou responsabilidade coletiva há 12 dias.</div>
              <div class="memory-fact">Próximo jogo fora de casa contra o Napoli.</div>
            </article>
            <article class="context-card">
              <div class="context-card-label"><span>Conhecimento permitido</span>${icon("eye")}</div>
              <div class="secret-row">${icon("lock")}<span>Viktor conhece a pressão da diretoria e as cláusulas do contrato.</span></div>
              <div class="secret-row" style="margin-top:9px">${icon("lock")}<span>Ele <strong>não sabe</strong> sobre a sondagem espanhola.</span></div>
            </article>
            <article class="context-card">
              <div class="context-card-label"><span>Intenção da cena</span>${icon("spark")}</div>
              <div class="memory-fact">Testar maturidade antes de um ambiente hostil.</div>
              <div class="memory-fact">Definir se Caio assume uma função de liderança.</div>
            </article>
          </aside>
        </section>
      </div>
    `;
  }

  function renderChatMessage(message) {
    if (message.type === "narration") {
      return `<p class="narration">${escapeHTML(message.text)}</p>`;
    }
    const data = { name: message.speaker, initials: message.initials, color: message.color };
    return `
      <div class="chat-message ${message.type === "user" ? "user" : "npc"}">
        ${avatar(data, "avatar-sm")}
        <div class="message-body">
          <div class="message-meta"><strong>${escapeHTML(message.speaker)}</strong>${message.role ? `<span>${escapeHTML(message.role)}</span>` : ""}<span>${escapeHTML(message.time || "agora")}</span></div>
          <div class="message-bubble">${escapeHTML(message.text).replaceAll("\n", "<br>")}</div>
        </div>
      </div>
    `;
  }

  function renderTyping(character) {
    return `
      <div class="chat-message npc" id="typingMessage">
        ${avatar(character, "avatar-sm")}
        <div class="message-body">
          <div class="message-meta"><strong>${escapeHTML(character.name)}</strong><span>digitando</span></div>
          <div class="message-bubble typing-bubble"><i></i><i></i><i></i></div>
        </div>
      </div>
    `;
  }

  function scrollChat() {
    const scroller = document.querySelector("#chatScroll");
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  function renderPostgame() {
    const d = ui.postgameDraft;
    const storyPack = state.lastStoryPack;
    return `
      <div class="page postgame-page">
        <header class="page-header">
          <div><span class="page-kicker">Entrada oficial</span><h1>O apito tocou.<br>Agora começa o mundo.</h1><p>Registre somente o que aconteceu no seu jogo. O InyffX constrói a repercussão sem alterar nenhum fato.</p></div>
          <div class="page-header-actions"><button class="button button-ghost" type="button" data-action="load-match-example">Usar exemplo</button></div>
        </header>
        <section class="postgame-layout">
          <form class="card form-card" id="postgameForm">
            <div class="fact-rule">
              <span class="fact-rule-icon">${icon("lock")}</span>
              <div><strong>Camada factual bloqueada</strong><p>Placar, gols, cartões e lesões vêm do seu save. A narrativa pode interpretar o impacto — nunca reescrever o jogo.</p></div>
            </div>

            <div class="field-section">
              <div class="section-label"><strong>Partida</strong><span>Dados obrigatórios</span></div>
              <div class="form-grid">
                <div class="form-field full"><label for="competition">Competição</label><select class="select" id="competition" data-pg-field="competition"><option ${selected(d.competition, "Premier League")}>Premier League</option><option ${selected(d.competition, "UEFA Champions League")}>UEFA Champions League</option><option ${selected(d.competition, "FA Cup")}>FA Cup</option><option ${selected(d.competition, "Amistoso")}>Amistoso</option></select></div>
              </div>
              <div class="score-entry" style="margin-top:13px">
                <div class="form-field"><label for="homeClub">Mandante</label><input class="input" id="homeClub" data-pg-field="homeClub" value="${escapeHTML(d.homeClub)}"></div>
                <div class="form-field"><label for="homeScore">Gols</label><input class="input score-input" id="homeScore" data-pg-field="homeScore" inputmode="numeric" type="number" min="0" max="20" value="${escapeHTML(d.homeScore)}"></div>
                <div class="score-divider">×</div>
                <div class="form-field"><label for="awayScore">Gols</label><input class="input score-input" id="awayScore" data-pg-field="awayScore" inputmode="numeric" type="number" min="0" max="20" value="${escapeHTML(d.awayScore)}"></div>
                <div class="form-field"><label for="awayClub">Visitante</label><input class="input" id="awayClub" data-pg-field="awayClub" value="${escapeHTML(d.awayClub)}"></div>
              </div>
            </div>

            <div class="field-section">
              <div class="section-label"><strong>Desempenho de ${escapeHTML(state.career.name.split(" ")[0])}</strong><span>Fatos do jogo</span></div>
              <div class="form-grid cols-4">
                ${numberField("Gols", "goals", d.goals, "")}
                ${numberField("Assistências", "assists", d.assists, "")}
                ${numberField("Nota", "rating", d.rating, "/10", 0, 10, "0.1")}
                ${numberField("Minutos", "minutes", d.minutes, "min", 0, 130)}
              </div>
              <div class="form-grid" style="margin-top:13px">
                <div class="form-field"><label for="cards">Cartões</label><select class="select" id="cards" data-pg-field="cards"><option ${selected(d.cards, "Nenhum")}>Nenhum</option><option ${selected(d.cards, "Amarelo")}>Amarelo</option><option ${selected(d.cards, "Vermelho")}>Vermelho</option></select></div>
                <div class="form-field"><label for="injury">Lesão</label><select class="select" id="injury" data-pg-field="injury"><option ${selected(d.injury, "Não")}>Não</option><option ${selected(d.injury, "Leve")}>Leve</option><option ${selected(d.injury, "Moderada")}>Moderada</option><option ${selected(d.injury, "Grave")}>Grave</option></select></div>
              </div>
            </div>

            <div class="field-section">
              <div class="section-label"><strong>Como os gols aconteceram</strong><button class="text-link" type="button" data-action="add-goal">${icon("plus")} Adicionar gol</button></div>
              <div id="goalEntries">
                ${ui.goalEntries.map((goal, index) => `
                  <div class="goal-entry">
                    <input class="input score-input" aria-label="Minuto do gol ${index + 1}" data-goal-index="${index}" data-goal-field="minute" type="number" min="1" max="130" value="${escapeHTML(goal.minute)}">
                    <input class="input" aria-label="Descrição do gol ${index + 1}" data-goal-index="${index}" data-goal-field="detail" value="${escapeHTML(goal.detail)}">
                    <button class="icon-button" type="button" data-action="remove-goal" data-goal-index="${index}" aria-label="Remover gol">${icon("close")}</button>
                  </div>
                `).join("")}
              </div>
            </div>

            <div class="field-section">
              <div class="section-label"><strong>Acontecimentos importantes</strong><span>Opcional</span></div>
              <textarea class="textarea" id="notes" data-pg-field="notes" placeholder="Clima, torcida, falha, provocação, defesa decisiva...">${escapeHTML(d.notes)}</textarea>
            </div>

            <div class="form-actions">
              <button class="button button-ghost" type="button" data-action="clear-match">Limpar</button>
              <button class="button button-primary" type="submit">Gerar repercussão ${icon("spark")}</button>
            </div>
          </form>

          <aside class="card output-card" id="storyOutput">
            ${storyPack ? renderStoryPack(storyPack) : renderStoryEmpty()}
          </aside>
        </section>
      </div>
    `;
  }

  function selected(current, expected) {
    return current === expected ? "selected" : "";
  }

  function numberField(label, field, value, suffix, min = 0, max = 99, step = "1") {
    return `
      <div class="form-field stat-entry">
        <label for="${field}">${label}</label>
        <input class="input" id="${field}" data-pg-field="${field}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${escapeHTML(value)}">
        ${suffix ? `<span>${suffix}</span>` : ""}
      </div>
    `;
  }

  function renderStoryEmpty() {
    return `
      <div class="output-empty">
        <span class="output-orb">${icon("spark")}</span>
        <h3>O mundo está esperando os fatos</h3>
        <p>Preencha a partida para gerar manchetes, torcida, coletiva, mensagens e consequências sem contradizer seu save.</p>
      </div>
    `;
  }

  function renderStoryPack(pack) {
    return `
      <div class="story-pack">
        <div class="story-cover">
          <span class="tag">Crown Football · Agora</span>
          <h3>${escapeHTML(pack.headline)}</h3>
        </div>
        <section class="story-section">
          <strong>${icon("lock")} Fatos preservados</strong>
          <div class="reaction-card"><p>${escapeHTML(pack.factLine)}</p></div>
        </section>
        <section class="story-section">
          <strong>${icon("message")} Repercussão</strong>
          ${pack.reactions.map((reaction) => `
            <div class="reaction-card"><div class="reaction-author"><strong>${escapeHTML(reaction.author)}</strong><span>${escapeHTML(reaction.type)}</span></div><p>${escapeHTML(reaction.text)}</p></div>
          `).join("")}
        </section>
        <section class="story-section">
          <strong>${icon("mic")} Primeira pergunta da coletiva</strong>
          <div class="reaction-card"><p>“${escapeHTML(pack.pressQuestion)}”</p></div>
        </section>
        <div class="canon-actions">
          <button class="button" type="button" data-action="start-press-conference">Viver coletiva</button>
          <button class="button button-primary" type="button" data-action="save-match-canon" ${pack.saved ? "disabled" : ""}>${pack.saved ? "Salvo no cânone" : "Confirmar cânone"}</button>
        </div>
      </div>
    `;
  }

  function renderCanon() {
    const filters = [
      ["all", "Tudo"], ["game", "Jogo"], ["rp", "Roleplay"], ["secret", "Segredos"], ["possible", "Possibilidades"],
    ];
    const query = ui.canonSearch.trim().toLowerCase();
    const filtered = state.timeline.filter((event) => {
      const matchesKind = ui.canonFilter === "all" || event.kind === ui.canonFilter;
      const matchesQuery = !query || `${event.title} ${event.description} ${event.category}`.toLowerCase().includes(query);
      return matchesKind && matchesQuery;
    });
    let lastSeason = "";
    const stream = filtered.map((event) => {
      const divider = event.season !== lastSeason ? `<div class="season-divider">${escapeHTML(event.season)}</div>` : "";
      lastSeason = event.season;
      return `${divider}${renderCanonEvent(event)}`;
    }).join("");

    return `
      <div class="page canon-page">
        <header class="page-header">
          <div><span class="page-kicker">Memória objetiva</span><h1>Cânone da carreira</h1><p>A verdade persistente do seu universo: fatos, relações, segredos e possibilidades claramente separados.</p></div>
          <div class="page-header-actions"><button class="button button-ghost" type="button" data-action="export-save">${icon("download")} Exportar</button><button class="button button-primary" type="button" data-action="add-canon">${icon("plus")} Novo fato</button></div>
        </header>

        <section class="canon-summary">
          <article class="card canon-summary-card"><span>Fatos objetivos</span><strong>${formatNumber(state.stats.canonFacts)}</strong><small>vindos do jogo e do usuário</small></article>
          <article class="card canon-summary-card"><span>Eventos de RP</span><strong>${formatNumber(state.stats.rpEvents)}</strong><small>confirmados em cena</small></article>
          <article class="card canon-summary-card"><span>Personagens</span><strong>${formatNumber(state.stats.characters)}</strong><small>com memória própria</small></article>
          <article class="card canon-summary-card"><span>Segredos ativos</span><strong>${formatNumber(state.stats.secrets)}</strong><small>acesso limitado por personagem</small></article>
        </section>

        <div class="toolbar">
          <div class="segmented" aria-label="Filtrar cânone">${filters.map(([value, label]) => `<button class="segment ${ui.canonFilter === value ? "active" : ""}" type="button" data-canon-filter="${value}">${label}</button>`).join("")}</div>
          <label class="search-field">${icon("search")}<input class="input" id="canonSearch" value="${escapeHTML(ui.canonSearch)}" placeholder="Buscar no cânone"></label>
        </div>

        <section class="canon-layout">
          <div class="card canon-stream">
            ${stream || `<div class="empty-state">${icon("search")}<strong>Nenhum acontecimento encontrado</strong><p>Tente outro filtro ou uma busca diferente.</p></div>`}
          </div>
          <aside class="card memory-map">
            <div class="card-header"><div><h2 class="card-title">Mapa de memória</h2><p class="card-subtitle">O que a IA recupera por contexto</p></div><span class="memory-health"><i></i>Saudável</span></div>
            <div class="memory-map-visual">
              <svg viewBox="0 0 280 240" preserveAspectRatio="none" aria-hidden="true"><line x1="140" y1="120" x2="55" y2="49"></line><line x1="140" y1="120" x2="225" y2="54"></line><line x1="140" y1="120" x2="55" y2="191"></line><line x1="140" y1="120" x2="222" y2="193"></line></svg>
              <span class="memory-node center">${escapeHTML(state.career.name.split(" ")[0])}</span><span class="memory-node n1">Partidas</span><span class="memory-node n2">Relações</span><span class="memory-node n3">Locais</span><span class="memory-node n4">Segredos</span>
            </div>
            <div class="integrity-row"><span>Contradições detectadas</span><strong>0</strong></div>
            <div class="integrity-row"><span>Eventos sem fonte</span><strong>2</strong></div>
            <div class="integrity-row"><span>Última atualização</span><strong>agora</strong></div>
            <button class="button" style="width:100%;margin-top:14px" type="button" data-action="inspect-memory">Inspecionar memória</button>
          </aside>
        </section>
      </div>
    `;
  }

  function renderCanonEvent(event) {
    return `
      <article class="canon-event" data-kind="${event.kind}">
        <div class="event-date"><strong>${escapeHTML(event.day)}</strong><span>${escapeHTML(event.month)}</span></div>
        <div class="event-card">
          <div class="event-top">${tagFor(event.kind)}<button class="text-link" type="button" data-action="event-options">•••</button></div>
          <h3>${escapeHTML(event.title)}</h3><p>${escapeHTML(event.description)}</p>
          <div class="event-people">${event.people.map((person) => avatar({ initials: person, color: person === "CA" ? "#337ea0" : "#53645a" })).join("")}<span>${escapeHTML(event.category)}</span></div>
        </div>
      </article>
    `;
  }

  function renderCharacters() {
    const selectedCharacter = state.characters.find((character) => character.id === ui.selectedCharacter) || state.characters[0];
    return `
      <div class="page characters-page">
        <header class="page-header">
          <div><span class="page-kicker">Pessoas, não barras</span><h1>Personagens</h1><p>Cada pessoa carrega personalidade, razões, lembranças e limites próprios de conhecimento.</p></div>
          <div class="page-header-actions"><button class="button button-ghost" type="button" data-action="knowledge-matrix">${icon("eye")} Quem sabe o quê</button><button class="button button-primary" type="button" data-action="add-character">${icon("plus")} Novo personagem</button></div>
        </header>
        <div class="toolbar">
          <div class="segmented"><button class="segment active" type="button">Todos</button><button class="segment" type="button">Clube</button><button class="segment" type="button">Família</button><button class="segment" type="button">Mídia</button><button class="segment" type="button">Rivais</button></div>
          <label class="search-field">${icon("search")}<input class="input" placeholder="Buscar personagem"></label>
        </div>
        <section class="character-layout">
          <div class="character-grid">
            ${state.characters.map((character) => renderCharacterCard(character, character.id === selectedCharacter.id)).join("")}
          </div>
          ${renderDossier(selectedCharacter)}
        </section>
      </div>
    `;
  }

  function renderCharacterCard(character, selectedCharacter) {
    return `
      <button class="card character-card ${selectedCharacter ? "selected" : ""}" type="button" data-character-id="${character.id}">
        <span class="character-head">${avatar(character, "avatar-lg")}<span><strong>${escapeHTML(character.name)}</strong><span>${escapeHTML(character.role)}</span></span></span>
        <span class="relationship-type"><span>${escapeHTML(character.relation)}</span><strong>${character.trust}/100</strong></span>
        <span class="relation-meter"><i style="width:${character.trust}%"></i></span>
        <span class="relationship-reason">${escapeHTML(character.reason)}</span>
      </button>
    `;
  }

  function renderDossier(character) {
    return `
      <aside class="card character-dossier">
        <div class="dossier-cover">${avatar(character)}</div>
        <div class="dossier-body">
          <h2>${escapeHTML(character.name)}</h2><p class="dossier-role">${escapeHTML(character.role)} · ${escapeHTML(character.relation)}</p>
          <div class="dossier-stats"><div class="dossier-stat"><strong>${character.trust}</strong><span>Confiança</span></div><div class="dossier-stat"><strong>${character.respect}</strong><span>Respeito</span></div><div class="dossier-stat"><strong>${character.tension}</strong><span>Tensão</span></div></div>
          <section class="dossier-section"><strong>Como essa pessoa age</strong><p>${escapeHTML(character.traits)}</p></section>
          <section class="dossier-section"><strong>Último acontecimento</strong><p>${escapeHTML(character.lastEvent)}</p></section>
          <section class="dossier-section"><strong>O que sabe</strong><div>${character.knows.map((fact) => `<span class="knowledge-chip">${icon("eye")}${escapeHTML(fact)}</span>`).join("")}</div></section>
          <section class="dossier-section"><strong>Limite de conhecimento</strong><p>${escapeHTML(character.secret)}</p></section>
          <div class="inline-actions"><button class="button button-primary" type="button" data-action="start-character-scene" data-character-id="${character.id}">Iniciar cena</button><button class="button" type="button" data-action="edit-character">Editar ficha</button></div>
        </div>
      </aside>
    `;
  }

  function renderUniverse() {
    const tabs = [
      ["social", "message", "Social"],
      ["news", "spark", "Notícias"],
      ["calendar", "calendar", "Calendário"],
      ["finances", "wallet", "Finanças"],
      ["hall", "trophy", "Hall da carreira"],
    ];
    return `
      <div class="page universe-page">
        <header class="page-header">
          <div><span class="page-kicker">O mundo ao redor</span><h1>Seu universo</h1><p>Mídia, torcida, rotina, patrimônio e acaso — tudo conectado ao mesmo cânone.</p></div>
          <div class="page-header-actions"><button class="button button-primary" type="button" data-action="roll-die">${icon("dice")} Rolar evento</button></div>
        </header>
        <nav class="universe-tabs" aria-label="Áreas do universo">
          ${tabs.map(([value, iconName, label]) => `<button class="universe-tab ${ui.universeTab === value ? "active" : ""}" type="button" data-universe-tab="${value}">${icon(iconName)}${label}</button>`).join("")}
        </nav>
        <section class="universe-layout">
          <div>${renderUniverseContent()}</div>
          ${renderChanceCard()}
        </section>
      </div>
    `;
  }

  function renderUniverseContent() {
    const renderers = {
      social: renderSocial,
      news: renderNews,
      calendar: renderCalendar,
      finances: renderFinances,
      hall: renderHall,
    };
    return renderers[ui.universeTab]();
  }

  function renderSocial() {
    const posts = [
      { initials: "CF", color: "#2f6b54", name: "Crown Football", handle: "@crownfootball", text: `${state.career.name.split(" ")[0]} decidiu aos 90'. Duas finalizações, dois gols e Stamford Bridge em êxtase. Noite de protagonista.`, likes: "18,4 mil", replies: "1,2 mil", verified: true },
      { initials: "DM", color: "#5a65a0", name: "Dante Moretti", handle: "@dantemoretti", text: "Em casa todo mundo parece gigante. Quero ver quando o estádio inteiro estiver contra você. 🇮🇹", likes: "42,1 mil", replies: "4,8 mil", verified: true },
      { initials: "BL", color: "#1748c7", name: "Blue London BR", handle: "@bluelondonbr", text: "Ele aponta para o escudo depois do gol e vocês querem que a gente tenha calma? O homem ENTENDEU o clube.", likes: "9,7 mil", replies: "682", verified: false },
      { initials: "MS", color: "#82527c", name: "Maya Silva", handle: "@mayasilva", text: "Além dos gols: a resposta mais interessante da coletiva foi sobre responsabilidade. Há uma mudança clara no discurso de Caio.", likes: "3,1 mil", replies: "214", verified: true },
    ];
    return `<article class="card feed-card"><div class="card-header"><div><h2 class="card-title">Em alta na sua bolha</h2><p class="card-subtitle">Feed fictício gerado a partir do cânone</p></div><span class="status-chip"><i></i>Ao vivo</span></div>${posts.map((post) => `<div class="feed-item">${avatar(post, "avatar-sm")}<div class="feed-copy"><div class="feed-meta"><strong>${escapeHTML(post.name)}</strong>${post.verified ? `<span class="verified">●</span>` : ""}<span>${escapeHTML(post.handle)} · 12 min</span></div><p>${escapeHTML(post.text)}</p><div class="feed-actions"><span>♡ ${post.likes}</span><span>◯ ${post.replies}</span><span>↗ compartilhar</span></div></div></div>`).join("")}</article>`;
  }

  function renderNews() {
    return `<div class="news-grid"><article class="news-card"><span class="news-source">Crown Football</span><h3>O minuto 90 que mudou o tom da temporada em Londres</h3><time>Há 18 minutos · 6 min de leitura</time></article><article class="news-card"><span class="news-source">Touchline</span><h3>Hale prepara função especial para ${escapeHTML(state.career.name.split(" ")[0])} em Nápoles</h3><time>Há 42 minutos · Análise</time></article><article class="news-card wide"><span class="news-source">The Terrace</span><h3>Da base no Rio à noite europeia: por que a torcida já canta seu nome</h3><time>Hoje · Perfil</time></article></div>`;
  }

  function renderCalendar() {
    const days = [
      ["qua", "26", [["Recuperação", "16:00", ""], ["Cena com Viktor", "22:00", "personal"]]],
      ["qui", "27", [["Treino tático", "09:30", ""], ["Jantar do grupo", "20:00", "personal"]]],
      ["sex", "28", [["Viagem a Nápoles", "13:10", ""], ["Coletiva", "18:30", "personal"]]],
      ["sáb", "29", [["Napoli × Chelsea", "20:45", "match"]]],
      ["dom", "30", [["Retorno a Londres", "11:20", ""]]],
      ["seg", "31", [["Dia livre", "—", "personal"]]],
      ["ter", "01", [["Treino", "10:00", ""]]],
    ];
    return `<article class="card calendar-card"><div class="card-header"><div><h2 class="card-title">Semana da carreira</h2><p class="card-subtitle">26 de agosto — 1 de setembro</p></div><button class="button button-sm" type="button" data-action="calendar-add">${icon("plus")} Compromisso</button></div><div class="calendar-week">${days.map((day, index) => `<div class="calendar-day ${index === 0 ? "today" : ""}"><span>${day[0]}</span><strong>${day[1]}</strong>${day[2].map((event) => `<div class="calendar-event ${event[2]}">${event[0]}<br><small>${event[1]}</small></div>`).join("")}</div>`).join("")}</div></article>`;
  }

  function renderFinances() {
    const transactions = [
      ["Salário semanal", "Chelsea · 25 ago", 92000, true],
      ["Aluguel · Londres", "Residência · 24 ago", -8400, false],
      ["Equipe pessoal", "Fisioterapia e imagem", -3200, false],
      ["Bônus de vitória", "Chelsea × Liverpool", 18000, true],
    ];
    return `<article class="card finance-card"><div class="card-header"><div><h2 class="card-title">Patrimônio</h2><p class="card-subtitle">Visão opcional de finanças da carreira</p></div><span class="tag tag-rp">Modo detalhado</span></div><div class="finance-overview"><div class="finance-kpi"><span>Patrimônio estimado</span><strong>${formatMoney(2860000)}</strong><small>+6,4% nesta temporada</small></div><div class="finance-kpi"><span>Receita mensal</span><strong>${formatMoney(386000)}</strong><small>contratos ativos</small></div><div class="finance-kpi"><span>Disponível</span><strong>${formatMoney(428000)}</strong><small>liquidez</small></div></div><div>${transactions.map(([label,date,value,incoming]) => `<div class="transaction-row"><span class="transaction-icon">${icon(incoming ? "download" : "wallet")}</span><span class="transaction-copy"><strong>${label}</strong><span>${date}</span></span><span class="transaction-value ${incoming ? "in" : ""}">${incoming ? "+" : ""}${formatMoney(value)}</span></div>`).join("")}</div></article>`;
  }

  function renderHall() {
    const trophies = [
      ["trophy", "Copa do Brasil", "Flamengo · 2025", false],
      ["spark", "Revelação do Ano", "Brasil · 2025", false],
      ["trophy", "Supercopa Inglesa", "Chelsea · 2026", false],
      ["lock", "UEFA Champions League", "Objetivo de carreira", true],
      ["lock", "Bola de Ouro", "Objetivo de carreira", true],
      ["lock", "Copa do Mundo", "Objetivo de carreira", true],
    ];
    return `<article class="card hall-card"><div class="card-header"><div><h2 class="card-title">Hall da carreira</h2><p class="card-subtitle">Conquistas, recordes e sonhos</p></div><span class="status-chip">3 conquistas</span></div><div class="trophy-grid">${trophies.map(([iconName,title,subtitle,locked]) => `<div class="trophy-card ${locked ? "locked" : ""}"><span class="trophy-icon">${icon(iconName)}</span><strong>${title}</strong><span>${subtitle}</span></div>`).join("")}</div></article>`;
  }

  function renderChanceCard() {
    const sides = ui.dieSides;
    return `
      <aside class="card chance-card">
        <div class="card-header"><div><h2 class="card-title">Acaso narrativo</h2><p class="card-subtitle">Resultado interpretado, nunca imposto</p></div><div class="segmented"><button class="segment ${sides === 6 ? "active" : ""}" type="button" data-die-sides="6">D6</button><button class="segment ${sides === 20 ? "active" : ""}" type="button" data-die-sides="20">D20</button></div></div>
        <div class="chance-visual"><span class="dice-result" id="diceResult">${ui.roll || sides}</span></div>
        <div class="chance-copy"><strong>${ui.rollEvent ? escapeHTML(ui.rollEvent.title) : "Acontecimento da semana"}</strong><p>${ui.rollEvent ? escapeHTML(ui.rollEvent.description) : `Role um D${sides}. O número define a intensidade; você ainda decide se o acontecimento entra na história.`}</p></div>
        <div class="chance-actions"><button class="button button-primary" type="button" data-action="roll-die">${icon("dice")} Rolar D${sides}</button><button class="button" type="button" data-action="canonize-roll" ${ui.rollEvent ? "" : "disabled"}>Canonizar</button></div>
      </aside>
    `;
  }

  function renderCareerMenu() {
    closeMenus();
    const menu = document.createElement("div");
    menu.className = "menu-popover career-menu";
    menu.innerHTML = `<div class="menu-label">Carreira ativa</div><button class="menu-item active" type="button"><span class="club-glyph">${escapeHTML(state.career.club[0] || "I")}</span><span class="menu-item-copy"><strong>${escapeHTML(state.career.name)}</strong><span>${escapeHTML(state.career.club)} · ${escapeHTML(state.career.season)}</span></span>${icon("check")}</button><div class="menu-separator"></div><button class="menu-item" type="button" data-action="new-career">${icon("plus")}<span class="menu-item-copy"><strong>Criar nova carreira</strong><span>Começar outro universo</span></span></button><button class="menu-item" type="button" data-action="export-save">${icon("download")}<span class="menu-item-copy"><strong>Exportar save</strong><span>Arquivo JSON local</span></span></button>`;
    document.body.append(menu);
  }

  function renderNotifications() {
    closeMenus();
    const menu = document.createElement("div");
    menu.className = "menu-popover notifications-menu";
    menu.innerHTML = `<div class="menu-label">Atualizações do universo</div><button class="menu-item" type="button" data-route="roleplay"><span class="toast-icon">${icon("message")}</span><span class="menu-item-copy"><strong>Viktor aguarda uma resposta</strong><span>A cena ao vivo está pausada.</span></span></button><button class="menu-item" type="button" data-route="universe"><span class="toast-icon">${icon("spark")}</span><span class="menu-item-copy"><strong>Seu nome está em alta</strong><span>18,4 mil reações após o jogo.</span></span></button><button class="menu-item" type="button" data-route="canon"><span class="toast-icon">${icon("timeline")}</span><span class="menu-item-copy"><strong>2 fatos pedem revisão</strong><span>Eventos sem fonte confirmada.</span></span></button>`;
    document.body.append(menu);
  }

  function renderProfileMenu() {
    closeMenus();
    const menu = document.createElement("div");
    menu.className = "menu-popover profile-menu";
    menu.innerHTML = `<div class="menu-label">Demo local</div><button class="menu-item" type="button" data-action="new-career">${icon("users")}<span class="menu-item-copy"><strong>Editar protagonista</strong><span>${escapeHTML(state.career.name)}</span></span></button><button class="menu-item" type="button" data-action="toggle-soundtrack-visibility">${icon("play")}<span class="menu-item-copy"><strong>${state.settings.soundtrackVisible ? "Ocultar" : "Mostrar"} player</strong><span>Trilha da carreira</span></span></button><button class="menu-item" type="button" data-action="export-save">${icon("download")}<span class="menu-item-copy"><strong>Exportar save</strong><span>Backup do cânone em JSON</span></span></button><div class="menu-separator"></div><button class="menu-item" type="button" data-action="confirm-reset">${icon("timeline")}<span class="menu-item-copy"><strong>Restaurar demonstração</strong><span>Apaga alterações locais</span></span></button>`;
    document.body.append(menu);
  }

  function openSearch() {
    closeMenus();
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal command-modal" role="dialog" aria-modal="true" aria-label="Busca rápida"><label class="command-search">${icon("search")}<input id="commandSearch" autocomplete="off" placeholder="Busque uma área, pessoa ou ação..."><small>ESC</small></label><div class="command-results" id="commandResults">${commandResults("")}</div></div></div>`;
    requestAnimationFrame(() => document.querySelector("#commandSearch")?.focus());
  }

  function commandResults(query) {
    const commands = [
      ["home", "home", "Ir para o início", "Painel geral da carreira"],
      ["roleplay", "message", "Continuar roleplay", "Retomar a cena com Viktor"],
      ["postgame", "whistle", "Registrar partida", "Transformar um jogo em repercussão"],
      ["canon", "timeline", "Abrir cânone", "Consultar fatos e acontecimentos"],
      ["characters", "users", "Ver personagens", "Relações e conhecimento"],
      ["universe", "orbit", "Explorar universo", "Mídia, calendário e finanças"],
    ];
    const normalized = query.trim().toLowerCase();
    const filtered = commands.filter((item) => !normalized || `${item[2]} ${item[3]}`.toLowerCase().includes(normalized));
    return filtered.map(([route, iconName, title, subtitle]) => `<button class="command-result" type="button" data-route="${route}"><span class="command-result-icon">${icon(iconName)}</span><span><strong>${title}</strong><span>${subtitle}</span></span></button>`).join("") || `<div class="empty-state"><strong>Nada encontrado</strong><p>Tente buscar por roleplay, cânone ou partida.</p></div>`;
  }

  function openCareerWizard(editExisting = false) {
    closeMenus();
    ui.wizardStep = 1;
    ui.draftCareer = editExisting ? clone(state.career) : {
      name: "",
      age: 18,
      nationality: "Brasil",
      position: "ATA",
      shirt: 9,
      dominantFoot: "Direito",
      club: "",
      formerClub: "",
      season: "2026/27",
      game: "EA FC",
      archetype: "",
      personality: "",
      origin: "",
      objective: "",
      depth: "realistic",
      modules: ["midia", "relacoes", "sorte"],
    };
    renderCareerWizard();
  }

  function renderCareerWizard() {
    const d = ui.draftCareer;
    const step = ui.wizardStep;
    const titles = ["Quem é o protagonista?", "De onde ele vem?", "Como este universo funciona?", "Pronto para o primeiro capítulo?"];
    const descriptions = ["A base objetiva da carreira. Você poderá aprofundar tudo depois.", "Personalidade e passado ajudam a IA a interpretar o mundo sem decidir pelo personagem.", "Escolha o tom e os sistemas que terão espaço na narrativa.", "Revise o essencial. O banco de dados guarda os fatos; a IA dá vida a eles."];
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <form class="modal modal-lg" id="careerWizard" role="dialog" aria-modal="true" aria-labelledby="wizardTitle">
          <header class="modal-header"><div><h2 id="wizardTitle">Criar carreira</h2><p>Etapa ${step} de 4 · seu personagem, suas decisões</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">${icon("close")}</button></header>
          <div class="modal-body">
            <div class="wizard-progress">${[1,2,3,4].map((item) => `<i class="${item <= step ? "done" : ""}"></i>`).join("")}</div>
            <h3 class="wizard-title">${titles[step - 1]}</h3><p class="wizard-description">${descriptions[step - 1]}</p>
            ${renderWizardStep(step, d)}
          </div>
          <footer class="modal-footer"><button class="button button-ghost" type="button" data-action="wizard-back" ${step === 1 ? "disabled" : ""}>Voltar</button><button class="button button-primary" type="submit">${step === 4 ? "Criar universo" : `Continuar ${icon("arrow")}`}</button></footer>
        </form>
      </div>
    `;
    requestAnimationFrame(() => document.querySelector("#careerWizard input:not([type=radio]):not([type=checkbox])")?.focus());
  }

  function renderWizardStep(step, d) {
    if (step === 1) {
      return `<div class="form-grid"><div class="form-field full"><label for="wc-name">Nome completo</label><input class="input" id="wc-name" data-career-field="name" required value="${escapeHTML(d.name)}" placeholder="Nome do seu jogador"></div><div class="form-field"><label for="wc-age">Idade</label><input class="input" id="wc-age" data-career-field="age" type="number" min="15" max="45" value="${escapeHTML(d.age)}"></div><div class="form-field"><label for="wc-nationality">Nacionalidade</label><input class="input" id="wc-nationality" data-career-field="nationality" value="${escapeHTML(d.nationality)}"></div><div class="form-field"><label for="wc-position">Posição</label><select class="select" id="wc-position" data-career-field="position">${["GOL","ZAG","LD","LE","VOL","MC","MEI","PE","PD","SA","ATA"].map((value) => `<option ${selected(d.position,value)}>${value}</option>`).join("")}</select></div><div class="form-field"><label for="wc-shirt">Número da camisa</label><input class="input" id="wc-shirt" data-career-field="shirt" type="number" min="1" max="99" value="${escapeHTML(d.shirt)}"></div><div class="form-field"><label for="wc-foot">Pé dominante</label><select class="select" id="wc-foot" data-career-field="dominantFoot"><option ${selected(d.dominantFoot,"Direito")}>Direito</option><option ${selected(d.dominantFoot,"Esquerdo")}>Esquerdo</option><option ${selected(d.dominantFoot,"Ambidestro")}>Ambidestro</option></select></div><div class="form-field"><label for="wc-club">Clube atual</label><input class="input" id="wc-club" data-career-field="club" required value="${escapeHTML(d.club)}" placeholder="Seu clube no save"></div><div class="form-field"><label for="wc-season">Temporada</label><input class="input" id="wc-season" data-career-field="season" value="${escapeHTML(d.season)}"></div></div>`;
    }
    if (step === 2) {
      return `<div class="form-grid"><div class="form-field"><label for="wc-game">Jogo de origem</label><select class="select" id="wc-game" data-career-field="game"><option ${selected(d.game,"EA FC")}>EA FC</option><option ${selected(d.game,"eFootball / PES")}>eFootball / PES</option><option ${selected(d.game,"Football Manager")}>Football Manager</option><option ${selected(d.game,"Outro")}>Outro</option></select></div><div class="form-field"><label for="wc-former">Clube anterior</label><input class="input" id="wc-former" data-career-field="formerClub" value="${escapeHTML(d.formerClub)}" placeholder="Opcional"></div><div class="form-field full"><label for="wc-archetype">Estilo de jogo</label><input class="input" id="wc-archetype" data-career-field="archetype" value="${escapeHTML(d.archetype)}" placeholder="Ex.: ponta veloz, camisa 10 criativo, zagueiro construtor"></div><div class="form-field full"><label for="wc-personality">Personalidade</label><textarea class="textarea" id="wc-personality" data-career-field="personality" placeholder="Como seu personagem costuma agir?">${escapeHTML(d.personality)}</textarea></div><div class="form-field full"><label for="wc-origin">História de infância</label><textarea class="textarea" id="wc-origin" data-career-field="origin" placeholder="Onde cresceu, quem o apoiou, o que marcou sua formação...">${escapeHTML(d.origin)}</textarea></div><div class="form-field full"><label for="wc-objective">Grande objetivo de carreira</label><input class="input" id="wc-objective" data-career-field="objective" value="${escapeHTML(d.objective)}" placeholder="O sonho que move essa história"></div></div>`;
    }
    if (step === 3) {
      const modules = [["vida","Vida pessoal"],["midia","Mídia e torcida"],["relacoes","Relações"],["romance","Romance"],["financas","Finanças"],["sorte","Roletas e dados"]];
      return `<div class="depth-options"><label class="depth-option"><input type="radio" name="depth" value="realistic" data-career-field="depth" ${d.depth === "realistic" ? "checked" : ""}><span><b>Realista</b><strong>Pé no chão</strong><small>Consequências plausíveis, ritmo gradual e pouco melodrama.</small></span></label><label class="depth-option"><input type="radio" name="depth" value="cinematic" data-career-field="depth" ${d.depth === "cinematic" ? "checked" : ""}><span><b>Cinematográfico</b><strong>Grandes momentos</strong><small>Mais tensão, viradas e cenas memoráveis sem quebrar o cânone.</small></span></label><label class="depth-option"><input type="radio" name="depth" value="custom" data-career-field="depth" ${d.depth === "custom" ? "checked" : ""}><span><b>Personalizado</b><strong>Seu equilíbrio</strong><small>Você calibra cada área conforme a história avança.</small></span></label></div><div class="section-label" style="margin-top:24px"><strong>Módulos ativos</strong><span>Altere quando quiser</span></div><div class="module-grid">${modules.map(([value,label]) => `<label class="module-toggle"><input type="checkbox" data-career-module="${value}" ${d.modules.includes(value) ? "checked" : ""}><span>${label}</span></label>`).join("")}</div>`;
    }
    return `<div class="review-card"><div class="review-hero">${avatar({ name: d.name, initials: initials(d.name), color: "#337ea0" }, "avatar-lg")}<div><strong>${escapeHTML(d.name || "Seu jogador")}</strong><span>${escapeHTML(d.club || "Clube não informado")} · ${escapeHTML(d.season)}</span></div></div><div class="review-grid"><div><small>Posição</small><strong>${escapeHTML(d.position)}</strong></div><div><small>Camisa</small><strong>#${escapeHTML(d.shirt)}</strong></div><div><small>Nacionalidade</small><strong>${escapeHTML(d.nationality)}</strong></div><div><small>Pé</small><strong>${escapeHTML(d.dominantFoot)}</strong></div><div><small>Tom</small><strong>${escapeHTML(d.depth)}</strong></div><div><small>Módulos</small><strong>${d.modules.length} ativos</strong></div></div></div><div class="fact-rule" style="margin:16px 0 0"><span class="fact-rule-icon">${icon("lock")}</span><div><strong>Princípio InyffX</strong><p>O banco de dados será a memória objetiva. A IA será narradora e intérprete — nunca dona dos fatos nem do seu personagem.</p></div></div>`;
  }

  function addCanonModal() {
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal modal-sm" id="addCanonForm" role="dialog" aria-modal="true"><header class="modal-header"><div><h2>Novo fato</h2><p>Adicione algo que já aconteceu no seu universo.</p></div><button class="icon-button" type="button" data-action="close-modal">${icon("close")}</button></header><div class="modal-body"><div class="form-field"><label for="factTitle">Título</label><input class="input" id="factTitle" name="title" required placeholder="O que aconteceu?"></div><div class="form-field" style="margin-top:13px"><label for="factDescription">Contexto</label><textarea class="textarea" id="factDescription" name="description" placeholder="Detalhes importantes para a memória"></textarea></div><div class="form-field" style="margin-top:13px"><label for="factKind">Natureza</label><select class="select" id="factKind" name="kind"><option value="game">Fato do jogo</option><option value="rp">Fato do roleplay</option><option value="secret">Segredo</option><option value="possible">Possibilidade</option></select></div></div><footer class="modal-footer"><button class="button button-ghost" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Salvar no cânone</button></footer></form></div>`;
    requestAnimationFrame(() => document.querySelector("#factTitle")?.focus());
  }

  function confirmResetModal() {
    closeMenus();
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal modal-sm" role="alertdialog" aria-modal="true"><header class="modal-header"><div><h2>Restaurar demonstração?</h2><p>Suas alterações locais serão apagadas.</p></div><button class="icon-button" type="button" data-action="close-modal">${icon("close")}</button></header><div class="modal-body"><p style="margin:0;color:var(--muted);font-size:11px;line-height:1.65">Exporte o save antes se quiser guardar sua carreira. Esta ação só afeta os dados deste navegador.</p></div><footer class="modal-footer"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button button-danger" type="button" data-action="reset-demo">Restaurar demo</button></footer></div></div>`;
  }

  function exportSave() {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), app: "InyffX", ...state }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = state.career.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    link.href = url;
    link.download = `inyffx-${slug || "carreira"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Save exportado", "Seu cânone foi baixado em JSON.", "download");
  }

  function sendRoleplayMessage(text) {
    const clean = text.trim();
    if (!clean || ui.typing) return;
    state.chat.push({ id: uid("chat"), type: "user", speaker: `Você · ${state.career.name.split(" ")[0]}`, initials: initials(state.career.name), color: "#337ea0", time: "agora", text: clean });
    saveState();
    ui.typing = true;
    render();
    window.setTimeout(() => {
      state.chat.push({ id: uid("chat"), type: "npc", speaker: "Viktor Hale", role: "Treinador", initials: "VH", color: "#53645a", time: "agora", text: scriptedCoachReply(clean) });
      ui.typing = false;
      saveState();
      if (ui.route === "roleplay") render();
    }, 900);
  }

  function scriptedCoachReply(text) {
    const normalized = text.toLowerCase();
    if (/pronto|pressão|confio|pode contar/.test(normalized)) return "Eu queria ouvir isso, mas palavras são a parte fácil. Em Nápoles, se o jogo ficar caótico, quero que você peça a bola e faça o time respirar. Você aceita essa responsabilidade?";
    if (/escalação|posição|função|jogar/.test(normalized)) return "Você começa por dentro, com liberdade para atacar o espaço quando Leo abrir o campo. Mas há uma condição: quando perdermos a bola, sua primeira corrida é para trás. Alguma dúvida sobre a função?";
    if (/aconteceu|problema|diretoria|algo/.test(normalized)) return "Nada que mude o plano. A diretoria só está atenta ao barulho ao seu redor. Eu me importo com o que acontece aqui dentro — e preciso saber se posso confiar em você quando o jogo sair do roteiro.";
    if (/não|cansado|preciso|difícil/.test(normalized)) return "Prefiro essa honestidade a uma resposta ensaiada. Então me diga o que você precisa de mim e do grupo antes de entrarmos naquele estádio.";
    return "Viktor observa por alguns segundos, sem interromper. Então apoia os antebraços na mesa. “Certo. Quero que vá além da resposta segura: o que você realmente pretende fazer quando a pressão chegar?”";
  }

  function generateStoryPack() {
    const d = ui.postgameDraft;
    if (!d.homeClub.trim() || !d.awayClub.trim()) {
      showToast("Faltam os clubes", "Informe mandante e visitante para continuar.", "whistle");
      return;
    }
    const homeScore = Number(d.homeScore) || 0;
    const awayScore = Number(d.awayScore) || 0;
    const playerClubIsHome = d.homeClub.toLowerCase() === state.career.club.toLowerCase();
    const playerScore = playerClubIsHome ? homeScore : awayScore;
    const opponentScore = playerClubIsHome ? awayScore : homeScore;
    const won = playerScore > opponentScore;
    const drew = playerScore === opponentScore;
    const firstName = state.career.name.split(" ")[0];
    const goalText = Number(d.goals) === 1 ? "um gol" : `${Number(d.goals) || 0} gols`;
    const resultWord = won ? "vitória" : drew ? "empate" : "derrota";
    state.lastStoryPack = {
      id: uid("pack"),
      saved: false,
      generatedAt: new Date().toISOString(),
      headline: won ? `${firstName} decide no limite e transforma Londres em palco particular` : drew ? `${firstName} chama a responsabilidade em noite de tensão` : `Mesmo com ${goalText}, ${state.career.club} sai ferido de uma noite dramática`,
      factLine: `${d.homeClub} ${homeScore} × ${awayScore} ${d.awayClub}. ${state.career.name}: ${goalText}, ${Number(d.assists) || 0} assistência(s), nota ${Number(d.rating).toFixed(1)} em ${Number(d.minutes) || 0} minutos.`,
      reactions: [
        { author: "Crown Football", type: "Manchete", text: `A atuação de ${firstName} virou o centro da ${resultWord}: personalidade, eficiência e um estádio inteiro respondendo a cada toque.` },
        { author: "@BlueLondonBR", type: "Torcida", text: Number(d.goals) > 0 ? `Quando a bola queimou, ele pediu. Quando a chance apareceu, ele decidiu. É disso que estamos falando.` : `Nem toda grande atuação precisa de gol. Hoje ele organizou o time quando tudo ameaçava escapar.` },
        { author: "Leo Duarte", type: "Mensagem privada", text: won ? "Irmão, ninguém vai dormir depois dessa. O grupo está te esperando." : "Cabeça em cima. O grupo sabe o que você entregou hoje." },
      ],
      pressQuestion: `${firstName}, depois de uma atuação tão individualmente marcante, você sente que o time já depende demais de você nos momentos decisivos?`,
      match: clone(d),
      goals: clone(ui.goalEntries),
    };
    saveState();
    render();
    requestAnimationFrame(() => document.querySelector("#storyOutput")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    showToast("Repercussão gerada", "Os fatos do jogo foram preservados.", "spark");
  }

  function saveMatchToCanon() {
    const pack = state.lastStoryPack;
    if (!pack || pack.saved) return;
    const m = pack.match;
    state.timeline.unshift({ id: uid("event"), day: "26", month: "ago", season: `Temporada ${state.career.season}`, kind: "game", category: "Partida", title: `${m.homeClub} ${m.homeScore} × ${m.awayScore} ${m.awayClub}`, description: `${state.career.name} registrou ${m.goals} gol(s), ${m.assists} assistência(s) e nota ${Number(m.rating).toFixed(1)}. ${m.notes || "Partida importada do save."}`, people: [initials(state.career.name)] });
    state.stats.canonFacts += 1;
    pack.saved = true;
    saveState();
    render();
    showToast("Partida canonizada", "O resultado agora faz parte da memória objetiva.", "lock");
  }

  function startPressConference() {
    const pack = state.lastStoryPack;
    if (!pack) return;
    state.chat.push({ id: uid("narration"), type: "narration", text: "A sala de imprensa está cheia. Flashes se acendem quando Caio se senta diante do painel. Maya Silva recebe o microfone para a primeira pergunta." });
    state.chat.push({ id: uid("chat"), type: "npc", speaker: "Maya Silva", role: "Jornalista · Touchline", initials: "MS", color: "#82527c", time: "agora", text: pack.pressQuestion });
    saveState();
    navigate("roleplay");
  }

  function rollDie() {
    const max = ui.dieSides;
    const result = Math.floor(Math.random() * max) + 1;
    const scaled = result / max;
    const events = scaled <= .2
      ? ["Contratempo inesperado", "Uma pequena lesão no treino muda a preparação da semana. A gravidade ainda deve ser definida por você."]
      : scaled <= .45
        ? ["Rumor ganha força", "Um jornalista publica uma informação incompleta sobre o futuro de Caio. Você decide se há verdade por trás dela."]
        : scaled <= .75
          ? ["Convite fora do roteiro", "Uma pessoa do passado está em Londres e pede um encontro antes da viagem."]
          : ["Oportunidade rara", "O clube oferece a Caio um papel de liderança numa iniciativa que pode elevar sua influência no elenco."];
    ui.roll = result;
    ui.rollEvent = { title: events[0], description: events[1] };
    render();
    requestAnimationFrame(() => document.querySelector("#diceResult")?.classList.add("rolling"));
  }

  function canonizeRoll() {
    if (!ui.rollEvent) return;
    state.timeline.unshift({ id: uid("event"), day: "26", month: "ago", season: `Temporada ${state.career.season}`, kind: "possible", category: "Acontecimento aleatório", title: ui.rollEvent.title, description: `${ui.rollEvent.description} Resultado: D${ui.dieSides} = ${ui.roll}.`, people: [initials(state.career.name)] });
    state.chanceEvents.unshift({ ...ui.rollEvent, roll: ui.roll, sides: ui.dieSides });
    saveState();
    showToast("Possibilidade registrada", "Ela ainda não é fato até acontecer em cena.", "dice");
    ui.roll = null;
    ui.rollEvent = null;
    render();
  }

  function createCareer() {
    const d = ui.draftCareer;
    if (!d.name.trim() || !d.club.trim()) {
      ui.wizardStep = 1;
      renderCareerWizard();
      showToast("Complete o essencial", "Nome e clube atual são obrigatórios.", "users");
      return;
    }
    const fresh = clone(DEFAULT_STATE);
    fresh.theme = state.theme;
    fresh.settings = clone(state.settings);
    fresh.career = { ...fresh.career, ...clone(d) };
    fresh.stats = { appearances: 0, goals: 0, assists: 0, rating: 0, reputation: 12, energy: 100, canonFacts: 1, rpEvents: 0, characters: fresh.characters.length, secrets: 0 };
    fresh.nextMatch = { opponent: "A definir", competition: "Próximo compromisso", date: "—", time: "—", venue: "Calendário da carreira", leg: "Aguardando dados" };
    fresh.chat = [{ id: uid("narration"), type: "narration", text: `Primeiro dia de ${d.name} no ${d.club}. O universo está pronto; nenhum passo foi dado ainda.` }];
    fresh.timeline = [{ id: uid("event"), day: "26", month: "ago", season: `Temporada ${d.season}`, kind: "game", category: "Carreira", title: `Início da carreira no ${d.club}`, description: `${d.name}, ${d.age} anos, ${d.position}, camisa ${d.shirt}. Este é o ponto inicial informado pelo jogador.`, people: [initials(d.name)] }];
    fresh.inbox = [];
    fresh.missions = [
      { id: "m1", title: "Apresentar-se ao elenco", detail: "Comece a primeira cena da carreira", xp: 100, done: false },
      { id: "m2", title: "Registrar próxima partida", detail: "Adicione o calendário do seu save", xp: 80, done: false },
      { id: "m3", title: "Completar a história", detail: "Adicione família, amigos e objetivos", xp: 60, done: false },
    ];
    state = fresh;
    saveState();
    closeModal();
    navigate("home");
    showToast("Universo criado", `${d.name} agora tem uma carreira própria no InyffX.`, "spark");
  }

  function addRandomMission() {
    const options = [
      ["Ligar para alguém da família", "Uma conversa curta pode mudar o tom do dia", 50],
      ["Treinar finalização", "Sessão extra depois do treino", 90],
      ["Visitar um companheiro", "Fortaleça uma relação fora de campo", 70],
      ["Rever o último jogo", "Analise três decisões importantes", 60],
    ];
    const [title, detail, xp] = options[Math.floor(Math.random() * options.length)];
    state.missions.push({ id: uid("mission"), title, detail, xp, done: false });
    saveState();
    render();
    showToast("Novo objetivo", title, "spark");
  }

  function addCanonFact(form) {
    const data = new FormData(form);
    const kind = data.get("kind");
    state.timeline.unshift({ id: uid("event"), day: "26", month: "ago", season: `Temporada ${state.career.season}`, kind, category: kind === "game" ? "Futebol" : kind === "secret" ? "Segredo" : kind === "possible" ? "Possibilidade" : "Roleplay", title: data.get("title").trim(), description: data.get("description").trim() || "Fato adicionado manualmente pelo jogador.", people: [initials(state.career.name)] });
    if (kind === "game") state.stats.canonFacts += 1;
    if (kind === "rp") state.stats.rpEvents += 1;
    if (kind === "secret") state.stats.secrets += 1;
    saveState();
    closeModal();
    render();
    showToast("Cânone atualizado", "O novo registro foi salvo localmente.", "timeline");
  }

  function handleClick(event) {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) {
      event.preventDefault();
      navigate(routeButton.dataset.route);
      return;
    }

    const missionButton = event.target.closest("[data-mission-id]");
    if (missionButton) {
      const mission = state.missions.find((item) => item.id === missionButton.dataset.missionId);
      if (mission) {
        mission.done = !mission.done;
        saveState();
        render();
        showToast(mission.done ? "Objetivo concluído" : "Objetivo reaberto", mission.title, mission.done ? "check" : "timeline");
      }
      return;
    }

    const characterButton = event.target.closest("[data-character-id]");
    if (characterButton && !characterButton.dataset.action) {
      ui.selectedCharacter = characterButton.dataset.characterId;
      render();
      return;
    }

    const canonFilter = event.target.closest("[data-canon-filter]");
    if (canonFilter) {
      ui.canonFilter = canonFilter.dataset.canonFilter;
      render();
      return;
    }

    const universeTab = event.target.closest("[data-universe-tab]");
    if (universeTab) {
      ui.universeTab = universeTab.dataset.universeTab;
      render();
      return;
    }

    const dieButton = event.target.closest("[data-die-sides]");
    if (dieButton) {
      ui.dieSides = Number(dieButton.dataset.dieSides);
      ui.roll = null;
      ui.rollEvent = null;
      render();
      return;
    }

    const promptButton = event.target.closest("[data-prompt]");
    if (promptButton) {
      const input = document.querySelector("#rpInput");
      if (input) {
        input.value = promptButton.dataset.prompt;
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      if (!event.target.closest(".menu-popover")) closeMenus();
      return;
    }
    const action = actionTarget.dataset.action;
    if (action === "close-modal" && event.target !== actionTarget && actionTarget.classList.contains("modal-backdrop")) return;

    const actions = {
      "toggle-theme": () => { state.theme = state.theme === "dark" ? "light" : "dark"; saveState(); updateChrome(); },
      "open-career-menu": renderCareerMenu,
      "open-notifications": renderNotifications,
      "open-profile": renderProfileMenu,
      "open-search": openSearch,
      "close-modal": closeModal,
      "dismiss-toast": () => actionTarget.closest(".toast")?.remove(),
      "new-career": () => openCareerWizard(false),
      "wizard-back": () => { ui.wizardStep = Math.max(1, ui.wizardStep - 1); renderCareerWizard(); },
      "export-save": exportSave,
      "confirm-reset": confirmResetModal,
      "reset-demo": () => { state = clone(DEFAULT_STATE); saveState(); closeModal(); render(); showToast("Demonstração restaurada", "O exemplo de Caio voltou ao estado inicial.", "check"); },
      "toggle-soundtrack": () => { state.settings.soundtrackPlaying = !state.settings.soundtrackPlaying; saveState(); updateChrome(); },
      "close-soundtrack": () => { state.settings.soundtrackVisible = false; state.settings.soundtrackPlaying = false; saveState(); updateChrome(); showToast("Player ocultado", "Você pode reativá-lo no menu do perfil.", "play"); },
      "toggle-soundtrack-visibility": () => { state.settings.soundtrackVisible = !state.settings.soundtrackVisible; closeMenus(); saveState(); updateChrome(); },
      "connect-spotify": () => showToast("Integração demonstrativa", "O login do Spotify será conectado ao backend na versão de produção.", "play"),
      "generate-mission": addRandomMission,
      "open-inbox": () => { const name = actionTarget.dataset.name; showToast(`Mensagem de ${name}`, "Abra o Roleplay para responder dentro da história.", "message"); },
      "save-scene": () => { state.stats.rpEvents += 1; saveState(); showToast("Marco da cena salvo", "A conversa foi registrada na memória do RP.", "timeline"); },
      "scene-options": () => showToast("Cena ao vivo", "Você pode encerrar, resumir ou marcar esta cena no backend final.", "sliders"),
      "attach-image": () => showToast("Upload de screenshots", "Nesta demo, a análise visual aparece como fluxo de produto; o envio real depende do backend.", "image"),
      "add-goal": () => { ui.goalEntries.push({ minute: "", detail: "" }); render(); },
      "remove-goal": () => { ui.goalEntries.splice(Number(actionTarget.dataset.goalIndex), 1); render(); },
      "load-match-example": () => { ui.postgameDraft = clone({ competition: "Premier League", homeClub: "Chelsea", awayClub: "Liverpool", homeScore: 3, awayScore: 2, goals: 2, assists: 0, rating: 9.2, minutes: 90, cards: "Nenhum", injury: "Não", notes: "Gol da vitória aos 90 minutos. A torcida cantou o nome de Caio após o apito final." }); ui.goalEntries = clone(DEFAULT_STATE.lastStoryPack?.goals || [{ minute: 31, detail: "Corte da direita para o centro e finalização rasteira no canto." }, { minute: 90, detail: "Rebote na entrada da área e chute de primeira para virar o jogo." }]); render(); showToast("Exemplo carregado", "Chelsea 3 × 2 Liverpool.", "whistle"); },
      "clear-match": () => { ui.postgameDraft = { competition: "Premier League", homeClub: state.career.club, awayClub: "", homeScore: 0, awayScore: 0, goals: 0, assists: 0, rating: 6, minutes: 90, cards: "Nenhum", injury: "Não", notes: "" }; ui.goalEntries = []; state.lastStoryPack = null; saveState(); render(); },
      "save-match-canon": saveMatchToCanon,
      "start-press-conference": startPressConference,
      "add-canon": addCanonModal,
      "event-options": () => showToast("Registro protegido", "Edição e fontes detalhadas entram no editor completo.", "lock"),
      "inspect-memory": () => showToast("Integridade verificada", "Nenhuma contradição crítica foi encontrada nesta demo.", "check"),
      "knowledge-matrix": () => showToast("Matriz de conhecimento", "A visualização completa será conectada ao banco de segredos.", "eye"),
      "add-character": () => showToast("Novo personagem", "O editor completo de NPCs será uma próxima tela do produto.", "users"),
      "edit-character": () => showToast("Ficha protegida", "A edição persistente será conectada ao backend de personagens.", "users"),
      "start-character-scene": () => { const character = state.characters.find((item) => item.id === actionTarget.dataset.characterId); if (character) { state.chat.push({ id: uid("narration"), type: "narration", text: `Uma nova cena começa com ${character.name}. A memória recuperou a relação atual e os limites do que essa pessoa sabe.` }); state.chat.push({ id: uid("chat"), type: "npc", speaker: character.name, role: character.role, initials: character.initials, color: character.color, time: "agora", text: `Você queria falar comigo, ${state.career.name.split(" ")[0]}?` }); saveState(); navigate("roleplay"); } },
      "roll-die": rollDie,
      "canonize-roll": canonizeRoll,
      "calendar-add": () => showToast("Novo compromisso", "O editor de calendário entra na próxima iteração.", "calendar"),
    };
    actions[action]?.();
  }

  function handleInput(event) {
    const target = event.target;
    if (target.id === "rpInput") {
      target.style.height = "auto";
      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
      return;
    }
    if (target.id === "canonSearch") {
      ui.canonSearch = target.value;
      const cursor = target.selectionStart;
      render();
      requestAnimationFrame(() => {
        const input = document.querySelector("#canonSearch");
        if (input) { input.focus(); input.setSelectionRange(cursor, cursor); }
      });
      return;
    }
    if (target.id === "commandSearch") {
      const results = document.querySelector("#commandResults");
      if (results) results.innerHTML = commandResults(target.value);
      return;
    }
    if (target.dataset.pgField) {
      const numeric = ["homeScore", "awayScore", "goals", "assists", "rating", "minutes"].includes(target.dataset.pgField);
      ui.postgameDraft[target.dataset.pgField] = numeric ? Number(target.value) : target.value;
      return;
    }
    if (target.dataset.goalField) {
      const entry = ui.goalEntries[Number(target.dataset.goalIndex)];
      if (entry) entry[target.dataset.goalField] = target.dataset.goalField === "minute" ? Number(target.value) : target.value;
      return;
    }
    if (target.dataset.careerField) {
      const field = target.dataset.careerField;
      ui.draftCareer[field] = ["age", "shirt"].includes(field) ? Number(target.value) : target.value;
      return;
    }
    if (target.dataset.careerModule) {
      const moduleName = target.dataset.careerModule;
      const set = new Set(ui.draftCareer.modules);
      target.checked ? set.add(moduleName) : set.delete(moduleName);
      ui.draftCareer.modules = [...set];
    }
  }

  function handleSubmit(event) {
    if (event.target.id === "roleplayForm") {
      event.preventDefault();
      const input = event.target.elements.message;
      sendRoleplayMessage(input.value);
      input.value = "";
      return;
    }
    if (event.target.id === "postgameForm") {
      event.preventDefault();
      generateStoryPack();
      return;
    }
    if (event.target.id === "careerWizard") {
      event.preventDefault();
      if (ui.wizardStep < 4) {
        if (ui.wizardStep === 1 && (!ui.draftCareer.name.trim() || !ui.draftCareer.club.trim())) {
          event.target.reportValidity();
          return;
        }
        ui.wizardStep += 1;
        renderCareerWizard();
      } else {
        createCareer();
      }
      return;
    }
    if (event.target.id === "addCanonForm") {
      event.preventDefault();
      addCanonFact(event.target);
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      closeModal();
      closeMenus();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.target.id === "rpInput" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.target.form?.requestSubmit();
    }
  }

  window.addEventListener("hashchange", render);
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleInput);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("keydown", handleKeydown);

  if (!window.location.hash) window.history.replaceState(null, "", "#/home");
  render();
})();
