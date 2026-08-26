(function () {
  "use strict";

  var STORAGE_KEY = "inyffx-interface-v2";
  var SESSION_KEY = "inyffx-active-career-v2";
  var SPOTIFY_TOKEN_KEY = "inyffx-spotify-token-v1";
  var SPOTIFY_VERIFIER_KEY = "inyffx-spotify-verifier-v1";
  var SPOTIFY_STATE_KEY = "inyffx-spotify-state-v1";
  var ROUTES = ["kick-off", "fyx-news", "relationships", "seasons", "player-career", "off-the-pitch"];
  var TOOL_TITLES = { match: "MODELO DE PARTIDA", wheel: "ROLETA", dice: "ROLAGEM DE DADOS" };
  var WHEEL_COLORS = ["#37484f", "#52636c", "#365c69", "#604e70", "#68704e", "#4b5d72", "#6a4f4f", "#38615c", "#5b536d", "#4f6261", "#5f6542", "#485078"];
  var PUBLIC_CONFIG = window.INYFFX_CONFIG || {};
  var state = loadState();
  var ui = {
    authTab: "login",
    createStep: 1,
    route: "kick-off",
    newsFilter: "all",
    careerTab: "pay",
    dieSides: 20,
    lastDice: null,
    wheelResult: "",
    wheelRotation: 0,
    settingsDraft: null,
    settingsSaved: false,
    spotifyTimer: null,
    sending: false
  };
  var el = {};

  function blankState() {
    return {
      version: 2,
      settings: {
        apiBaseUrl: String(PUBLIC_CONFIG.apiBaseUrl || ""),
        spotifyClientId: String(PUBLIC_CONFIG.spotifyClientId || ""),
        backgroundData: "",
        overlay: 58,
        blur: 0
      },
      careers: []
    };
  }

  function loadState() {
    var fallback = blankState();
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.careers)) return fallback;
      parsed.settings = Object.assign({}, fallback.settings, parsed.settings || {});
      parsed.careers = parsed.careers.map(normalizeCareer);
      return parsed;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeCareer(career) {
    var safe = career && typeof career === "object" ? career : {};
    safe.id = safe.id || uid("career");
    safe.name = safe.name || "Carreira";
    safe.auth = safe.auth || { email: "", passHash: "" };
    safe.profile = safe.profile || {};
    safe.messages = Array.isArray(safe.messages) ? safe.messages : [];
    safe.canonEvents = Array.isArray(safe.canonEvents) ? safe.canonEvents : [];
    safe.news = Array.isArray(safe.news) ? safe.news : [];
    safe.characters = Array.isArray(safe.characters) ? safe.characters : [];
    safe.seasons = Array.isArray(safe.seasons) ? safe.seasons : [];
    safe.finance = Object.assign({ initialized: false, currency: "BRL", balance: 0, transactions: [], pockets: [] }, safe.finance || {});
    safe.finance.transactions = Array.isArray(safe.finance.transactions) ? safe.finance.transactions : [];
    safe.finance.pockets = Array.isArray(safe.finance.pockets) ? safe.finance.pockets : [];
    safe.hall = Object.assign({ trophies: [], records: [], awards: [] }, safe.hall || {});
    safe.hall.trophies = Array.isArray(safe.hall.trophies) ? safe.hall.trophies : [];
    safe.hall.records = Array.isArray(safe.hall.records) ? safe.hall.records : [];
    safe.hall.awards = Array.isArray(safe.hall.awards) ? safe.hall.awards : [];
    safe.calendar = Array.isArray(safe.calendar) ? safe.calendar : [];
    safe.offPitch = Object.assign({ currentCity: "", currentResidence: "", houses: [] }, safe.offPitch || {});
    safe.offPitch.houses = Array.isArray(safe.offPitch.houses) ? safe.offPitch.houses : [];
    safe.tools = Object.assign({ wheelEntries: ["", ""], diceHistory: [] }, safe.tools || {});
    safe.tools.wheelEntries = Array.isArray(safe.tools.wheelEntries) && safe.tools.wheelEntries.length ? safe.tools.wheelEntries.slice(0, 12) : ["", ""];
    while (safe.tools.wheelEntries.length < 2) safe.tools.wheelEntries.push("");
    safe.tools.diceHistory = Array.isArray(safe.tools.diceHistory) ? safe.tools.diceHistory.slice(0, 16) : [];
    safe.sceneNumber = Number(safe.sceneNumber || 1);
    return safe;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      toast("Não foi possível salvar. A imagem de fundo pode ser grande demais para este navegador.", "error");
      return false;
    }
  }

  function uid(prefix) {
    var random = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    return String(prefix || "id") + "-" + random;
  }

  function activeCareer() {
    var activeId = sessionStorage.getItem(SESSION_KEY);
    return state.careers.find(function (career) { return career.id === activeId; }) || null;
  }

  function cacheElements() {
    [
      "authGate", "appShell", "loginForm", "loginCareer", "loginPasscode", "loginHint", "loginError",
      "createForm", "createError", "prevStep", "nextStep", "createCareer", "hubSidebar", "mobileMenu",
      "mobileSettings", "mobileNavScrim", "openSettings", "openProfile", "careerSeason", "careerPlayerName",
      "careerClub", "appMain", "chatMessages", "chatEmpty", "chatForm", "chatInput", "sendMessage",
      "sceneLabel", "newScene", "aiStatusChip", "toolDrawer", "toolTitle", "closeTools", "matchTemplateForm",
      "copyMatchTemplate", "insertMatchTemplate", "wheel", "wheelResult", "wheelEntries", "addWheelEntry",
      "spinWheel", "useWheelResult", "dicePicker", "diceResult", "rollDice", "useDiceResult", "diceHistory",
      "newsFilters", "newsContent", "relationshipSearch", "relationshipCount", "relationshipsContent",
      "seasonSelect", "seasonsContent", "careerContent", "copyOffPitchTemplate", "insertOffPitchTemplate",
      "offPitchTemplate", "residenceContent", "spotifyNow", "spotifyDisc", "spotifyStatus", "spotifyTrack",
      "spotifyArtist", "settingsModal", "settingsForm", "backgroundUpload", "overlayRange", "overlayOutput",
      "blurRange", "blurOutput", "resetBackground", "apiBaseUrl", "backendStatusDot", "backendStatusText",
      "spotifyClientId", "spotifyRedirectUri", "copyRedirectUri", "disconnectSpotify", "connectSpotify",
      "saveSettings", "profileModal", "profileContent", "closeProfile", "closeProfileFooter", "logoutCareer",
      "customBackground", "toastRegion"
    ].forEach(function (id) { el[id] = document.getElementById(id); });
  }

  function bindEvents() {
    document.querySelectorAll("[data-auth-tab]").forEach(function (button) {
      button.addEventListener("click", function () { setAuthTab(button.dataset.authTab); });
    });
    document.querySelectorAll("[data-switch-auth]").forEach(function (button) {
      button.addEventListener("click", function () { setAuthTab(button.dataset.switchAuth); });
    });
    el.prevStep.addEventListener("click", function () { setCreateStep(ui.createStep - 1); });
    el.nextStep.addEventListener("click", function () { if (validateCurrentStep()) setCreateStep(ui.createStep + 1); });
    el.createForm.addEventListener("submit", createCareerFromForm);
    el.loginForm.addEventListener("submit", loginToCareer);
    document.querySelectorAll("[data-route]").forEach(function (button) {
      button.addEventListener("click", function () { navigate(button.dataset.route); });
    });
    document.querySelectorAll("[data-route-link]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        navigate(link.dataset.routeLink);
      });
    });
    window.addEventListener("hashchange", routeFromHash);
    el.mobileMenu.addEventListener("click", toggleMobileNav);
    el.mobileNavScrim.addEventListener("click", closeMobileNav);
    el.openSettings.addEventListener("click", openSettings);
    el.mobileSettings.addEventListener("click", openSettings);
    el.openProfile.addEventListener("click", openProfile);
    el.closeProfile.addEventListener("click", closeProfile);
    el.closeProfileFooter.addEventListener("click", closeProfile);
    el.logoutCareer.addEventListener("click", logout);
    el.chatForm.addEventListener("submit", sendChatMessage);
    el.chatInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        el.chatForm.requestSubmit();
      }
    });
    el.chatInput.addEventListener("input", autosizeComposer);
    el.newScene.addEventListener("click", startNewScene);
    document.querySelectorAll("[data-open-tool]").forEach(function (button) {
      button.addEventListener("click", function () { openTool(button.dataset.openTool); });
    });
    el.closeTools.addEventListener("click", closeTools);
    document.querySelectorAll("[data-tool-tab]").forEach(function (button) {
      button.addEventListener("click", function () { selectTool(button.dataset.toolTab); });
    });
    el.copyMatchTemplate.addEventListener("click", function () {
      copyText(buildMatchTemplate()).then(function () { toast("Modelo de partida copiado."); });
    });
    el.insertMatchTemplate.addEventListener("click", function () {
      insertIntoChat(buildMatchTemplate());
      closeTools();
      toast("Modelo inserido no KICK OFF.");
    });
    el.addWheelEntry.addEventListener("click", addWheelEntry);
    el.wheelEntries.addEventListener("input", updateWheelEntry);
    el.wheelEntries.addEventListener("click", removeWheelEntry);
    el.spinWheel.addEventListener("click", spinWheel);
    el.useWheelResult.addEventListener("click", useWheelResult);
    el.dicePicker.addEventListener("click", selectDie);
    el.rollDice.addEventListener("click", rollDice);
    el.useDiceResult.addEventListener("click", useDiceResult);
    el.newsFilters.addEventListener("click", changeNewsFilter);
    el.relationshipSearch.addEventListener("input", renderRelationships);
    el.seasonSelect.addEventListener("change", renderSeasons);
    document.querySelectorAll("[data-career-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        ui.careerTab = button.dataset.careerTab;
        document.querySelectorAll("[data-career-tab]").forEach(function (item) { item.classList.toggle("is-active", item === button); });
        renderCareerPage();
      });
    });
    el.copyOffPitchTemplate.addEventListener("click", function () {
      copyText(el.offPitchTemplate.textContent).then(function () { toast("Modelo OFF THE PITCH copiado."); });
    });
    el.insertOffPitchTemplate.addEventListener("click", function () {
      insertIntoChat(el.offPitchTemplate.textContent);
      navigate("kick-off");
      toast("Relatório inserido no KICK OFF.");
    });
    el.settingsModal.addEventListener("close", function () {
      document.body.classList.remove("is-modal-open");
      if (!ui.settingsSaved) applyVisualSettings(state.settings);
      ui.settingsDraft = null;
    });
    el.profileModal.addEventListener("close", function () { document.body.classList.remove("is-modal-open"); });
    el.overlayRange.addEventListener("input", previewSettings);
    el.blurRange.addEventListener("input", previewSettings);
    el.backgroundUpload.addEventListener("change", importBackground);
    el.resetBackground.addEventListener("click", resetBackgroundDraft);
    el.saveSettings.addEventListener("click", saveSettings);
    el.copyRedirectUri.addEventListener("click", function () {
      copyText(getSpotifyRedirectUri()).then(function () { toast("Redirect URI copiada."); });
    });
    el.connectSpotify.addEventListener("click", beginSpotifyConnectFromSettings);
    el.disconnectSpotify.addEventListener("click", function () { disconnectSpotify(true); });
    el.spotifyNow.addEventListener("click", spotifySidebarAction);
  }

  function setAuthTab(name) {
    ui.authTab = name === "create" ? "create" : "login";
    document.querySelectorAll("[data-auth-tab]").forEach(function (button) {
      var active = button.dataset.authTab === ui.authTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-auth-panel]").forEach(function (panel) {
      panel.classList.toggle("is-active", panel.dataset.authPanel === ui.authTab);
    });
    el.loginError.textContent = "";
    el.createError.textContent = "";
  }

  function setCreateStep(step) {
    ui.createStep = Math.max(1, Math.min(4, step));
    document.querySelectorAll("[data-form-step]").forEach(function (panel) {
      panel.classList.toggle("is-active", Number(panel.dataset.formStep) === ui.createStep);
    });
    document.querySelectorAll("[data-progress]").forEach(function (segment) {
      segment.classList.toggle("is-active", Number(segment.dataset.progress) <= ui.createStep);
    });
    el.prevStep.hidden = ui.createStep === 1;
    el.nextStep.hidden = ui.createStep === 4;
    el.createCareer.hidden = ui.createStep !== 4;
    el.createError.textContent = "";
    var card = document.querySelector(".auth-card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateCurrentStep() {
    var current = document.querySelector('[data-form-step="' + ui.createStep + '"]');
    if (!current) return true;
    var inputs = Array.prototype.slice.call(current.querySelectorAll("input, select, textarea"));
    for (var i = 0; i < inputs.length; i += 1) {
      if (!inputs[i].checkValidity()) {
        inputs[i].reportValidity();
        return false;
      }
    }
    return true;
  }

  async function createCareerFromForm(event) {
    event.preventDefault();
    if (ui.createStep !== 4) {
      if (validateCurrentStep()) setCreateStep(ui.createStep + 1);
      return;
    }
    if (!validateCurrentStep() || !el.createForm.checkValidity()) {
      el.createForm.reportValidity();
      return;
    }
    var data = new FormData(el.createForm);
    var email = clean(data.get("email")).toLowerCase();
    var passcode = String(data.get("passcode") || "");
    if (state.careers.some(function (career) { return clean(career.auth && career.auth.email).toLowerCase() === email; })) {
      el.createError.textContent = "Já existe uma carreira local com este e-mail.";
      return;
    }
    el.createCareer.disabled = true;
    el.createCareer.textContent = "CRIANDO...";
    try {
      var profile = {
        playerName: clean(data.get("playerName")),
        birthDate: clean(data.get("birthDate")),
        nationality: clean(data.get("nationality")),
        birthCity: clean(data.get("birthCity")),
        pronouns: clean(data.get("pronouns")),
        height: clean(data.get("height")),
        weight: clean(data.get("weight")),
        gameTitle: clean(data.get("gameTitle")),
        platform: clean(data.get("platform")),
        currentClub: clean(data.get("currentClub")),
        league: clean(data.get("league")),
        season: clean(data.get("season")),
        shirtNumber: clean(data.get("shirtNumber")),
        position: clean(data.get("position")),
        secondaryPosition: clean(data.get("secondaryPosition")),
        dominantFoot: clean(data.get("dominantFoot")),
        playStyle: clean(data.get("playStyle")),
        formerClubs: clean(data.get("formerClubs")),
        personality: clean(data.get("personality")),
        backstory: clean(data.get("backstory")),
        careerGoals: clean(data.get("careerGoals")),
        storyTone: clean(data.get("storyTone")),
        depth: clean(data.get("depth")),
        modules: data.getAll("modules").map(clean),
        agentName: clean(data.get("agentName")),
        coachName: clean(data.get("coachName")),
        importantPeople: clean(data.get("importantPeople"))
      };
      var hasInitialBalance = String(data.get("initialBalance") || "") !== "";
      var career = normalizeCareer({
        id: uid("career"),
        name: clean(data.get("careerName")),
        auth: { email: email, passHash: await hashText(passcode) },
        profile: profile,
        messages: [],
        canonEvents: [],
        news: [],
        characters: createInitialCharacters(profile),
        seasons: [],
        finance: {
          initialized: hasInitialBalance,
          currency: clean(data.get("currency")) || "BRL",
          balance: numberOrZero(data.get("initialBalance")),
          transactions: [],
          pockets: []
        },
        hall: { trophies: [], records: [], awards: [] },
        calendar: [],
        offPitch: {
          currentCity: clean(data.get("currentCity")),
          currentResidence: clean(data.get("currentResidence")),
          houses: []
        },
        tools: { wheelEntries: ["", ""], diceHistory: [] },
        sceneNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      state.careers.push(career);
      if (!saveState()) throw new Error("storage");
      sessionStorage.setItem(SESSION_KEY, career.id);
      el.createForm.reset();
      setCreateStep(1);
      populateLoginCareers();
      startApp();
      toast("Carreira criada. O universo começou vazio.");
    } catch (error) {
      el.createError.textContent = "Não foi possível criar a carreira neste navegador.";
    } finally {
      el.createCareer.disabled = false;
      el.createCareer.innerHTML = "CRIAR E ENTRAR <span>→</span>";
    }
  }

  function createInitialCharacters(profile) {
    var characters = [];
    function add(name, role) {
      var cleaned = clean(name);
      if (!cleaned) return;
      if (characters.some(function (character) { return character.name.toLocaleLowerCase("pt-BR") === cleaned.toLocaleLowerCase("pt-BR"); })) return;
      characters.push({
        id: uid("character"),
        name: cleaned,
        role: role,
        relationship: "Não avaliada",
        relationshipLevel: null,
        summary: "Registrado no cânone inicial como " + role.toLocaleLowerCase("pt-BR") + ".",
        knownFacts: [],
        secretsKnown: [],
        lastUpdated: new Date().toISOString()
      });
    }
    add(profile.agentName, "Empresário(a)");
    add(profile.coachName, "Treinador(a)");
    splitCommaList(profile.importantPeople).forEach(function (name) { add(name, "Pessoa importante"); });
    return characters;
  }

  async function loginToCareer(event) {
    event.preventDefault();
    el.loginError.textContent = "";
    var career = state.careers.find(function (item) { return item.id === el.loginCareer.value; });
    if (!career) {
      el.loginError.textContent = "Selecione uma carreira salva.";
      return;
    }
    var candidate = await hashText(el.loginPasscode.value);
    if (candidate !== career.auth.passHash) {
      el.loginError.textContent = "Código de acesso incorreto.";
      return;
    }
    sessionStorage.setItem(SESSION_KEY, career.id);
    el.loginPasscode.value = "";
    startApp();
  }

  function populateLoginCareers() {
    if (!state.careers.length) {
      el.loginCareer.innerHTML = '<option value="">Nenhuma carreira local</option>';
      el.loginCareer.disabled = true;
      el.loginPasscode.disabled = true;
      el.loginHint.textContent = "Nenhuma carreira foi criada neste navegador.";
      return;
    }
    el.loginCareer.disabled = false;
    el.loginPasscode.disabled = false;
    el.loginHint.textContent = "As carreiras salvas neste navegador aparecem aqui.";
    el.loginCareer.innerHTML = '<option value="">Selecionar carreira</option>' + state.careers.map(function (career) {
      return '<option value="' + escapeHTML(career.id) + '">' + escapeHTML(career.name) + " · " + escapeHTML(career.profile.playerName || "Jogador") + "</option>";
    }).join("");
  }

  function showAuth() {
    el.appShell.hidden = true;
    el.authGate.hidden = false;
    populateLoginCareers();
    setAuthTab(state.careers.length ? "login" : "create");
  }

  function startApp() {
    var career = activeCareer();
    if (!career) {
      showAuth();
      return;
    }
    el.authGate.hidden = true;
    el.appShell.hidden = false;
    renderAll();
    routeFromHash();
    startSpotifyPolling();
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    closeProfile();
    closeTools();
    stopSpotifyPolling();
    showAuth();
    window.location.hash = "";
    toast("Você saiu da carreira.");
  }

  function navigate(route) {
    var target = ROUTES.indexOf(route) >= 0 ? route : "kick-off";
    if (window.location.hash.slice(1) !== target) window.location.hash = target;
    else activateRoute(target);
  }

  function routeFromHash() {
    var requested = window.location.hash.replace(/^#/, "");
    activateRoute(ROUTES.indexOf(requested) >= 0 ? requested : "kick-off");
  }

  function activateRoute(route) {
    ui.route = route;
    document.querySelectorAll("[data-page]").forEach(function (page) { page.classList.toggle("is-active", page.dataset.page === route); });
    document.querySelectorAll("[data-route]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.route === route); });
    closeMobileNav();
    if (route !== "kick-off") closeTools();
    renderRoute(route);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderRoute(route) {
    if (!activeCareer()) return;
    if (route === "kick-off") renderChat();
    if (route === "fyx-news") renderNews();
    if (route === "relationships") renderRelationships();
    if (route === "seasons") renderSeasons();
    if (route === "player-career") renderCareerPage();
    if (route === "off-the-pitch") renderResidence();
  }

  function toggleMobileNav() {
    var opening = !document.body.classList.contains("is-nav-open");
    document.body.classList.toggle("is-nav-open", opening);
    el.mobileNavScrim.hidden = !opening;
  }

  function closeMobileNav() {
    document.body.classList.remove("is-nav-open");
    el.mobileNavScrim.hidden = true;
  }

  function renderAll() {
    var career = activeCareer();
    if (!career) return;
    el.careerPlayerName.textContent = career.profile.playerName || "JOGADOR";
    el.careerSeason.textContent = career.profile.season ? "TEMPORADA " + career.profile.season : "CARREIRA ATIVA";
    el.careerClub.textContent = career.profile.currentClub || "Clube ainda não definido";
    el.sceneLabel.textContent = career.sceneNumber > 1 ? "Cena " + career.sceneNumber : "Roleplay livre";
    renderChat();
    renderNews();
    renderRelationships();
    populateSeasonSelect();
    renderSeasons();
    renderCareerPage();
    renderResidence();
    renderWheelEntries();
    renderDiceHistory();
    renderProfile();
    updateBackendStatus();
    applyVisualSettings(state.settings);
  }

  function renderChat() {
    var career = activeCareer();
    if (!career) return;
    if (!career.messages.length) {
      el.chatMessages.innerHTML = '<div class="empty-state empty-state--chat" id="chatEmpty"><span class="empty-state__index">00</span><h2>Seu universo começa na primeira mensagem.</h2><p>Você controla somente o seu personagem. A IA interpreta o mundo e os NPCs sem decidir o que você fala, sente ou faz.</p></div>';
      return;
    }
    el.chatMessages.innerHTML = career.messages.map(function (message) {
      var role = message.role === "assistant" ? "assistant" : "user";
      var author = role === "assistant" ? "INYFFX" : (career.profile.playerName || "VOCÊ");
      var label = role === "assistant" ? "NARRADOR" : "JOGADOR";
      return [
        '<article class="chat-message chat-message--', role, '">',
        '<div class="chat-message__meta"><strong>', escapeHTML(author), '</strong><span>', escapeHTML(label), ' · ', escapeHTML(formatTime(message.createdAt)), '</span></div>',
        '<div class="chat-message__body">', escapeHTML(message.content), '</div>',
        "</article>"
      ].join("");
    }).join("");
    requestAnimationFrame(function () { el.chatMessages.scrollTop = el.chatMessages.scrollHeight; });
  }

  async function sendChatMessage(event) {
    event.preventDefault();
    if (ui.sending) return;
    var career = activeCareer();
    var content = clean(el.chatInput.value);
    if (!career || !content) return;
    var userMessage = {
      id: uid("message"),
      role: "user",
      content: content,
      scene: career.sceneNumber,
      createdAt: new Date().toISOString()
    };
    career.messages.push(userMessage);
    career.updatedAt = userMessage.createdAt;
    var matchAdded = registerMatchFromMessage(career, userMessage);
    saveState();
    el.chatInput.value = "";
    autosizeComposer();
    renderAll();
    if (matchAdded) toast("Partida registrada em SEASONS e repercussão factual criada em FYX NEWS.");
    var apiBaseUrl = clean(state.settings.apiBaseUrl);
    if (!apiBaseUrl) {
      toast("Mensagem salva localmente. Conecte o backend para receber a resposta da IA.");
      return;
    }
    ui.sending = true;
    el.sendMessage.disabled = true;
    setAiStatus("IA PENSANDO", true);
    appendPendingMessage();
    try {
      var response = await fetch(joinUrl(apiBaseUrl, "/v1/roleplay/message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: "1.0",
          careerId: career.id,
          message: { id: userMessage.id, content: userMessage.content, scene: userMessage.scene, createdAt: userMessage.createdAt },
          context: buildBackendContext(career)
        })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var payload = await response.json();
      removePendingMessage();
      var reply = clean(payload.reply || (payload.message && payload.message.content));
      if (reply) {
        career.messages.push({
          id: (payload.message && payload.message.id) || uid("message"),
          role: "assistant",
          content: reply,
          scene: career.sceneNumber,
          createdAt: (payload.message && payload.message.createdAt) || new Date().toISOString()
        });
      }
      applyMemoryUpdates(career, payload.memoryUpdates || payload.updates || payload.memory || {});
      career.updatedAt = new Date().toISOString();
      saveState();
      renderAll();
      setAiStatus("IA CONECTADA", true);
    } catch (error) {
      removePendingMessage();
      setAiStatus("FALHA NA CONEXÃO", false);
      toast("A mensagem foi salva, mas o backend não respondeu. Verifique a URL e o CORS.", "error");
    } finally {
      ui.sending = false;
      el.sendMessage.disabled = false;
    }
  }

  function appendPendingMessage() {
    var article = document.createElement("article");
    article.className = "chat-message chat-message--assistant is-pending";
    article.id = "pendingMessage";
    article.innerHTML = '<div class="chat-message__meta"><strong>INYFFX</strong><span>NARRADOR</span></div><div class="chat-message__body">Construindo a próxima parte da cena</div>';
    el.chatMessages.appendChild(article);
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  }

  function removePendingMessage() {
    var pending = document.getElementById("pendingMessage");
    if (pending) pending.remove();
  }

  function buildBackendContext(career) {
    return {
      profile: career.profile,
      scene: career.sceneNumber,
      recentMessages: career.messages.slice(-12).map(function (message) {
        return { role: message.role, content: message.content, createdAt: message.createdAt };
      }),
      retrievalRequest: {
        includeRelevantCharacters: true,
        includeRecentCanon: true,
        includeCurrentSeason: true,
        includeSecretsByKnowledgeScope: true
      }
    };
  }

  function applyMemoryUpdates(career, updates) {
    if (!updates || typeof updates !== "object") return;
    upsertMany(career.news, updates.news);
    upsertMany(career.characters, updates.characters);
    upsertMany(career.canonEvents, updates.canonEvents);
    upsertMany(career.calendar, updates.calendar);
    if (Array.isArray(updates.seasons)) {
      updates.seasons.forEach(function (incoming) {
        if (!incoming || !incoming.label) return;
        var season = career.seasons.find(function (item) { return item.label === incoming.label; });
        if (!season) career.seasons.push(Object.assign({ id: uid("season"), matches: [] }, incoming));
        else {
          upsertMany(season.matches, Array.isArray(incoming.matches) ? incoming.matches : []);
          Object.keys(incoming).forEach(function (key) { if (key !== "matches") season[key] = incoming[key]; });
        }
      });
    }
    if (updates.finance && typeof updates.finance === "object") {
      if (Number.isFinite(Number(updates.finance.balance))) {
        career.finance.balance = Number(updates.finance.balance);
        career.finance.initialized = true;
      }
      if (updates.finance.currency) career.finance.currency = clean(updates.finance.currency);
      upsertMany(career.finance.transactions, updates.finance.transactions);
      upsertMany(career.finance.pockets, updates.finance.pockets);
    }
    if (updates.hall && typeof updates.hall === "object") {
      upsertMany(career.hall.trophies, updates.hall.trophies);
      upsertMany(career.hall.records, updates.hall.records);
      upsertMany(career.hall.awards, updates.hall.awards);
    }
    if (updates.offPitch && typeof updates.offPitch === "object") {
      if (typeof updates.offPitch.currentCity === "string") career.offPitch.currentCity = clean(updates.offPitch.currentCity);
      if (typeof updates.offPitch.currentResidence === "string") career.offPitch.currentResidence = clean(updates.offPitch.currentResidence);
      upsertMany(career.offPitch.houses, updates.offPitch.houses);
    }
  }

  function upsertMany(target, incoming) {
    if (!Array.isArray(target) || !Array.isArray(incoming)) return;
    incoming.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var normalized = Object.assign({}, item);
      normalized.id = normalized.id || uid("memory");
      var index = target.findIndex(function (existing) { return existing.id === normalized.id; });
      if (index >= 0) target[index] = Object.assign({}, target[index], normalized);
      else target.push(normalized);
    });
  }

  function startNewScene() {
    var career = activeCareer();
    if (!career) return;
    career.sceneNumber += 1;
    career.updatedAt = new Date().toISOString();
    el.sceneLabel.textContent = "Cena " + career.sceneNumber;
    saveState();
    toast("Cena " + career.sceneNumber + " iniciada. O cânone anterior foi preservado.");
    el.chatInput.focus();
  }

  function autosizeComposer() {
    el.chatInput.style.height = "auto";
    el.chatInput.style.height = Math.min(el.chatInput.scrollHeight, 190) + "px";
  }

  function openTool(tool) {
    selectTool(tool);
    el.toolDrawer.classList.add("is-open");
    el.toolDrawer.setAttribute("aria-hidden", "false");
    document.querySelector(".kick-layout").classList.add("has-tools");
  }

  function closeTools() {
    el.toolDrawer.classList.remove("is-open");
    el.toolDrawer.setAttribute("aria-hidden", "true");
    var layout = document.querySelector(".kick-layout");
    if (layout) layout.classList.remove("has-tools");
  }

  function selectTool(tool) {
    var target = TOOL_TITLES[tool] ? tool : "match";
    el.toolTitle.textContent = TOOL_TITLES[target];
    document.querySelectorAll("[data-tool-tab]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.toolTab === target); });
    document.querySelectorAll("[data-tool-panel]").forEach(function (panel) { panel.classList.toggle("is-active", panel.dataset.toolPanel === target); });
    if (target === "wheel") renderWheelEntries();
    if (target === "dice") renderDiceHistory();
  }

  function buildMatchTemplate() {
    var data = new FormData(el.matchTemplateForm);
    function value(name) {
      var result = clean(data.get(name));
      return result || "Não informado";
    }
    return [
      "[PARTIDA OFICIAL]",
      "Data: " + value("date"),
      "Temporada: " + value("season"),
      "Competição: " + value("competition"),
      "Mandante: " + value("homeTeam"),
      "Gols do mandante: " + value("homeScore"),
      "Visitante: " + value("awayTeam"),
      "Gols do visitante: " + value("awayScore"),
      "Minutos jogados: " + value("minutes"),
      "Nota: " + value("rating"),
      "Gols do meu jogador: " + value("goals"),
      "Assistências: " + value("assists"),
      "Cartões: " + value("cards"),
      "Lesão: " + value("injury"),
      "Como os gols aconteceram:",
      value("goalDetails"),
      "Acontecimentos importantes:",
      value("highlights"),
      "[/PARTIDA OFICIAL]"
    ].join("\n");
  }

  function registerMatchFromMessage(career, message) {
    var fields = parseTaggedBlock(message.content, "PARTIDA OFICIAL");
    if (!fields) return false;
    var homeTeam = validField(fieldValue(fields, "mandante"));
    var awayTeam = validField(fieldValue(fields, "visitante"));
    var homeScore = parseStrictNumber(fieldValue(fields, "gols do mandante"));
    var awayScore = parseStrictNumber(fieldValue(fields, "gols do visitante"));
    if (!homeTeam || !awayTeam || homeScore === null || awayScore === null) {
      toast("O modelo foi enviado, mas mandante, visitante e placar precisam estar preenchidos para atualizar SEASONS.", "error");
      return false;
    }
    var existing = career.seasons.some(function (season) {
      return (season.matches || []).some(function (match) { return match.sourceMessageId === message.id; });
    });
    if (existing) return false;
    var seasonLabel = validField(fieldValue(fields, "temporada")) || career.profile.season || "Sem temporada definida";
    var season = career.seasons.find(function (item) { return item.label === seasonLabel; });
    if (!season) {
      season = { id: uid("season"), label: seasonLabel, matches: [] };
      career.seasons.unshift(season);
    }
    var match = {
      id: uid("match"),
      sourceMessageId: message.id,
      date: validField(fieldValue(fields, "data")),
      season: seasonLabel,
      competition: validField(fieldValue(fields, "competicao")),
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      homeScore: homeScore,
      awayScore: awayScore,
      minutes: numberOrZero(fieldValue(fields, "minutos jogados")),
      rating: numberOrZero(fieldValue(fields, "nota")),
      goals: numberOrZero(fieldValue(fields, "gols do meu jogador")),
      assists: numberOrZero(fieldValue(fields, "assistencias")),
      cards: validField(fieldValue(fields, "cartoes")),
      injury: validField(fieldValue(fields, "lesao")),
      goalDetails: validField(fieldValue(fields, "como os gols aconteceram")),
      highlights: validField(fieldValue(fields, "acontecimentos importantes")),
      createdAt: message.createdAt
    };
    season.matches.unshift(match);
    career.news.unshift(createFactualMatchNews(career, match));
    career.canonEvents.push({
      id: uid("canon"),
      type: "match",
      title: homeTeam + " " + homeScore + " x " + awayScore + " " + awayTeam,
      occurredAt: match.date || message.createdAt,
      sourceMessageId: message.id,
      certainty: "fact"
    });
    return true;
  }

  function createFactualMatchNews(career, match) {
    var details = [];
    if (match.goals) details.push(plural(match.goals, "gol", "gols") + " de " + (career.profile.playerName || "seu jogador"));
    if (match.assists) details.push(plural(match.assists, "assistência", "assistências"));
    if (match.rating) details.push("nota " + formatDecimal(match.rating));
    var summary = details.length ? "O registro enviado ao KICK OFF confirma " + naturalList(details) + "." : "O placar foi registrado pelo jogador no KICK OFF e passou a integrar o cânone da carreira.";
    if (match.highlights) summary += " Destaque informado: " + match.highlights;
    return {
      id: uid("news"),
      type: "headline",
      title: match.homeTeam + " " + match.homeScore + " x " + match.awayScore + " " + match.awayTeam,
      summary: summary,
      source: "KICK OFF · RELATO DO JOGADOR",
      occurredAt: match.date || match.createdAt,
      createdAt: new Date().toISOString(),
      sourceMatchId: match.id
    };
  }

  function escapeRegExpText(value) {
    var specials = "\\^$.*+?()[]{}|";
    return String(value).split("").map(function (character) {
      return specials.indexOf(character) >= 0 ? "\\" + character : character;
    }).join("");
  }

  function parseTaggedBlock(text, tag) {
    var escapedTag = escapeRegExpText(tag);
    var match = String(text).match(new RegExp("\\[" + escapedTag + "\\]([\\s\\S]*?)\\[\\/" + escapedTag + "\\]", "i"));
    if (!match) return null;
    var fields = {};
    var currentKey = "";
    match[1].split(/\r?\n/).forEach(function (line) {
      var keyMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (keyMatch) {
        currentKey = normalizeKey(keyMatch[1]);
        fields[currentKey] = clean(keyMatch[2]);
      } else if (currentKey && clean(line)) {
        fields[currentKey] = clean((fields[currentKey] ? fields[currentKey] + "\n" : "") + line);
      }
    });
    return fields;
  }

  function fieldValue(fields, key) {
    return clean(fields[normalizeKey(key)] || "");
  }

  function validField(value) {
    var cleaned = clean(value);
    return /^nao informado$/i.test(normalizeKey(cleaned)) ? "" : cleaned;
  }

  function renderNews() {
    var career = activeCareer();
    if (!career) return;
    var items = career.news.filter(function (item) { return ui.newsFilter === "all" || item.type === ui.newsFilter; });
    if (!items.length) {
      el.newsContent.innerHTML = emptyMarkup(
        "02",
        ui.newsFilter === "all" ? "Nenhuma notícia publicada." : "Nenhum conteúdo nesta categoria.",
        "Manchetes, comentários, redes sociais, fofocas e análises aparecerão somente quando forem gerados a partir do cânone do KICK OFF."
      );
      return;
    }
    var lead = items[0];
    var stream = items.slice(1);
    el.newsContent.innerHTML = [
      '<div class="news-layout"><article class="news-feature">',
      '<span class="news-feature__type">', escapeHTML(newsTypeLabel(lead.type)), "</span>",
      "<h2>", escapeHTML(lead.title || "Atualização da carreira"), "</h2>",
      "<p>", escapeHTML(lead.summary || ""), "</p>",
      "<footer><span>", escapeHTML(lead.source || "FYX NEWS"), "</span><span>", escapeHTML(formatDate(lead.occurredAt || lead.createdAt)), "</span></footer>",
      '</article><div class="news-stream">', stream.map(renderNewsItem).join(""), "</div></div>"
    ].join("");
  }

  function renderNewsItem(item) {
    return [
      '<article class="news-item"><span class="news-item__type">', escapeHTML(newsTypeLabel(item.type)), "</span>",
      "<h3>", escapeHTML(item.title || "Atualização"), "</h3>",
      "<p>", escapeHTML(item.summary || ""), "</p>",
      "<footer><span>", escapeHTML(item.source || "FYX NEWS"), "</span><span>", escapeHTML(formatDate(item.occurredAt || item.createdAt)), "</span></footer></article>"
    ].join("");
  }

  function newsTypeLabel(type) {
    return { headline: "MANCHETE", social: "REDE SOCIAL", analysis: "ANÁLISE", gossip: "FOFOCA", comment: "COMENTÁRIOS", fanclub: "FANCLUB" }[type] || "ATUALIZAÇÃO";
  }

  function changeNewsFilter(event) {
    var button = event.target.closest("[data-news-filter]");
    if (!button) return;
    ui.newsFilter = button.dataset.newsFilter;
    document.querySelectorAll("[data-news-filter]").forEach(function (item) { item.classList.toggle("is-active", item === button); });
    renderNews();
  }

  function renderRelationships() {
    var career = activeCareer();
    if (!career) return;
    var query = normalizeKey(el.relationshipSearch.value || "");
    var characters = career.characters.filter(function (character) {
      return !query || normalizeKey([character.name, character.role, character.relationship].join(" ")).indexOf(query) >= 0;
    });
    el.relationshipCount.textContent = career.characters.length + (career.characters.length === 1 ? " PERSONAGEM" : " PERSONAGENS");
    if (!characters.length) {
      el.relationshipsContent.innerHTML = emptyMarkup(
        "03",
        query ? "Nenhum personagem encontrado." : "Nenhum personagem registrado.",
        query ? "Tente outro nome ou função." : "Cada pessoa citada e confirmada no roleplay terá uma ficha própria, fatos conhecidos, segredos e o motivo do estado atual da relação."
      );
      return;
    }
    el.relationshipsContent.innerHTML = '<div class="relationship-grid">' + characters.map(function (character) {
      var initials = clean(character.name).split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join("").toUpperCase();
      var relationshipLabel = character.relationship || "Não avaliada";
      var level = Number.isFinite(Number(character.relationshipLevel)) ? Math.round(Number(character.relationshipLevel)) + "/100" : "SEM NÍVEL";
      var summary = character.summary || "A ficha será aprofundada conforme este personagem viver cenas no KICK OFF.";
      return [
        '<article class="relationship-card"><div class="relationship-card__top"><span class="relationship-avatar">', escapeHTML(initials || "?"), '</span><span class="relationship-level">', escapeHTML(level), "</span></div>",
        "<h3>", escapeHTML(character.name || "Sem nome"), "</h3>",
        "<span>", escapeHTML(character.role || "Personagem"), " · ", escapeHTML(relationshipLabel), "</span>",
        "<p>", escapeHTML(summary), "</p></article>"
      ].join("");
    }).join("") + "</div>";
  }

  function populateSeasonSelect() {
    var career = activeCareer();
    if (!career) return;
    if (!career.seasons.length) {
      el.seasonSelect.innerHTML = '<option value="">Nenhuma</option>';
      el.seasonSelect.disabled = true;
      return;
    }
    var previous = el.seasonSelect.value;
    el.seasonSelect.disabled = false;
    el.seasonSelect.innerHTML = career.seasons.map(function (season) {
      return '<option value="' + escapeHTML(season.id) + '">' + escapeHTML(season.label) + "</option>";
    }).join("");
    if (career.seasons.some(function (season) { return season.id === previous; })) el.seasonSelect.value = previous;
  }

  function renderSeasons() {
    var career = activeCareer();
    if (!career) return;
    populateSeasonSelect();
    var season = career.seasons.find(function (item) { return item.id === el.seasonSelect.value; }) || career.seasons[0];
    if (!season || !Array.isArray(season.matches) || !season.matches.length) {
      el.seasonsContent.innerHTML = emptyMarkup(
        "04",
        "Nenhuma partida registrada.",
        "Use o modelo de partida no KICK OFF. Quando a mensagem for enviada, placar e números reais do seu save aparecerão aqui automaticamente."
      );
      return;
    }
    var stats = aggregateSeason(season.matches);
    el.seasonsContent.innerHTML = [
      '<div class="season-overview"><section class="season-stats"><span class="section-number">NÚMEROS DO JOGADOR</span><h2>', escapeHTML(season.label), '</h2><div class="stat-grid">',
      statCell(stats.matches, "PARTIDAS"), statCell(stats.minutes, "MINUTOS"), statCell(stats.goals, "GOLS"),
      statCell(stats.assists, "ASSISTÊNCIAS"), statCell(stats.averageRating ? formatDecimal(stats.averageRating) : "—", "NOTA MÉDIA"),
      statCell(stats.goalContributions, "PARTICIPAÇÕES"), '</div></section><section class="match-list"><div class="match-list__heading">ÚLTIMAS PARTIDAS NARRADAS</div>',
      season.matches.map(function (match) {
        var details = [];
        if (match.goals) details.push(match.goals + "G");
        if (match.assists) details.push(match.assists + "A");
        if (match.rating) details.push(formatDecimal(match.rating));
        return [
          '<article class="match-row"><span class="match-row__date">', escapeHTML(formatDate(match.date || match.createdAt)), '</span>',
          '<div class="match-row__fixture"><span>', escapeHTML(match.homeTeam), '</span><strong class="match-row__score">', match.homeScore, " — ", match.awayScore, '</strong><span>', escapeHTML(match.awayTeam), '</span></div>',
          '<span class="match-row__meta">', escapeHTML(details.join(" · ") || match.competition || "PARTIDA"), "</span></article>"
        ].join("");
      }).join(""), "</section></div>"
    ].join("");
  }

  function aggregateSeason(matches) {
    var totalRating = 0;
    var ratedMatches = 0;
    return matches.reduce(function (stats, match) {
      stats.matches += 1;
      stats.minutes += numberOrZero(match.minutes);
      stats.goals += numberOrZero(match.goals);
      stats.assists += numberOrZero(match.assists);
      if (numberOrZero(match.rating) > 0) {
        totalRating += numberOrZero(match.rating);
        ratedMatches += 1;
      }
      stats.goalContributions = stats.goals + stats.assists;
      stats.averageRating = ratedMatches ? totalRating / ratedMatches : 0;
      return stats;
    }, { matches: 0, minutes: 0, goals: 0, assists: 0, goalContributions: 0, averageRating: 0 });
  }

  function statCell(value, label) {
    return '<div class="stat-cell"><strong>' + escapeHTML(String(value)) + '</strong><span>' + escapeHTML(label) + "</span></div>";
  }

  function renderCareerPage() {
    var career = activeCareer();
    if (!career) return;
    if (ui.careerTab === "hall") renderHall(career);
    else if (ui.careerTab === "calendar") renderCalendar(career);
    else renderFinance(career);
  }

  function renderFinance(career) {
    var finance = career.finance;
    var hasData = finance.initialized || finance.transactions.length || finance.pockets.length;
    if (!hasData) {
      el.careerContent.innerHTML = emptyMarkup("05 / 01", "FYX Pay ainda não foi iniciado.", "Saldo, salário, gastos e caixinhas aparecerão quando forem informados no cânone ou atualizados pelo backend do KICK OFF.");
      return;
    }
    el.careerContent.innerHTML = [
      '<div class="finance-layout"><section class="balance-panel"><span>SALDO DISPONÍVEL</span><strong>', escapeHTML(formatMoney(finance.balance, finance.currency)), '</strong><div class="pocket-list">',
      finance.pockets.length ? finance.pockets.map(function (pocket) {
        return '<div class="pocket-item"><span>' + escapeHTML(pocket.name || "Caixinha") + '</span><strong>' + escapeHTML(formatMoney(pocket.amount || 0, finance.currency)) + "</strong></div>";
      }).join("") : '<div class="pocket-item"><span>Nenhuma caixinha registrada</span><strong>—</strong></div>',
      '</div></section><section class="transaction-list">',
      finance.transactions.length ? finance.transactions.map(function (transaction) {
        return '<article class="transaction-item"><span>' + escapeHTML(formatDate(transaction.date || transaction.createdAt)) + '</span><div><strong>' + escapeHTML(transaction.description || "Movimentação") + '</strong><span>' + escapeHTML(transaction.category || "") + '</span></div><strong>' + escapeHTML(formatSignedMoney(transaction.amount || 0, finance.currency)) + "</strong></article>";
      }).join("") : emptyMarkup("—", "Nenhuma movimentação.", "Gastos, ganhos e transferências confirmados pelo RP aparecerão nesta lista."),
      "</section></div>"
    ].join("");
  }

  function renderHall(career) {
    var hall = career.hall;
    var hasData = hall.trophies.length || hall.records.length || hall.awards.length;
    if (!hasData) {
      el.careerContent.innerHTML = emptyMarkup("05 / 02", "O Hall ainda está vazio.", "Troféus, recordes quebrados e premiações individuais só aparecem quando forem conquistados e confirmados no cânone.");
      return;
    }
    var combined = hall.trophies.map(function (item) { return Object.assign({ group: "TROFÉU" }, item); })
      .concat(hall.records.map(function (item) { return Object.assign({ group: "RECORDE" }, item); }))
      .concat(hall.awards.map(function (item) { return Object.assign({ group: "PRÊMIO" }, item); }));
    el.careerContent.innerHTML = [
      '<div class="hall-layout"><section class="career-side-panel"><span>LEGADO REGISTRADO</span><h2>HALL DA CARREIRA</h2><div class="hall-counts">',
      '<div><strong>', hall.trophies.length, '</strong><span>TROFÉUS</span></div><div><strong>', hall.records.length, '</strong><span>RECORDES</span></div><div><strong>', hall.awards.length, '</strong><span>PRÊMIOS</span></div></div></section><section class="record-list">',
      combined.map(function (item) {
        return '<article class="record-item"><span>' + escapeHTML(item.group + " · " + (item.season || item.date || "CARREIRA")) + '</span><strong>' + escapeHTML(item.title || item.name || "Conquista") + '</strong><span>' + escapeHTML(item.description || "") + "</span></article>";
      }).join(""), "</section></div>"
    ].join("");
  }

  function renderCalendar(career) {
    if (!career.calendar.length) {
      el.careerContent.innerHTML = emptyMarkup("05 / 03", "Nenhum compromisso marcado.", "Partidas, treinos, viagens, encontros e entrevistas confirmados durante o RP serão organizados aqui.");
      return;
    }
    var sorted = career.calendar.slice().sort(function (a, b) { return String(a.start || a.date || "").localeCompare(String(b.start || b.date || "")); });
    el.careerContent.innerHTML = '<div class="calendar-layout"><section class="career-side-panel"><span>AGENDA DO CÂNONE</span><h2>PRÓXIMOS COMPROMISSOS</h2><p>Somente eventos confirmados pelo roleplay.</p></section><section class="calendar-list">' + sorted.map(function (event) {
      return '<article class="calendar-item"><span>' + escapeHTML(formatDate(event.start || event.date)) + '</span><div><strong>' + escapeHTML(event.title || "Compromisso") + '</strong><span>' + escapeHTML(event.location || event.type || "") + '</span></div><strong>' + escapeHTML(formatClock(event.start || event.time)) + "</strong></article>";
    }).join("") + "</section></div>";
  }

  function renderResidence() {
    var career = activeCareer();
    if (!career) return;
    var offPitch = career.offPitch;
    var hasResidence = clean(offPitch.currentResidence) || clean(offPitch.currentCity);
    var houses = offPitch.houses || [];
    if (!hasResidence && !houses.length) {
      el.residenceContent.innerHTML = '<span class="section-number">MORADIAS DO JOGADOR</span><h3>NENHUM LOCAL REGISTRADO</h3><div class="residence-box__place"><strong>—</strong><span>A residência atual e as casas aparecerão quando forem confirmadas no roleplay.</span></div>';
      return;
    }
    el.residenceContent.innerHTML = [
      '<span class="section-number">MORADIAS DO JOGADOR</span><h3>ONDE VIVE AGORA</h3>',
      '<div class="residence-box__place"><strong>', escapeHTML(offPitch.currentResidence || "Moradia não detalhada"), '</strong><span>', escapeHTML(offPitch.currentCity || "Cidade não informada"), "</span></div>",
      houses.map(function (house) {
        return '<div class="residence-box__place"><strong>' + escapeHTML(house.name || house.type || "Imóvel") + '</strong><span>' + escapeHTML([house.city, house.status].filter(Boolean).join(" · ")) + "</span></div>";
      }).join("")
    ].join("");
  }

  function renderProfile() {
    var career = activeCareer();
    if (!career) return;
    var profile = career.profile;
    var rows = [
      ["Carreira", career.name], ["Jogador", profile.playerName],
      ["Nascimento", profile.birthDate ? formatDate(profile.birthDate) : ""], ["Nacionalidade", profile.nationality],
      ["Cidade natal", profile.birthCity], ["Pronomes", profile.pronouns],
      ["Altura", profile.height ? profile.height + " cm" : ""], ["Peso", profile.weight ? profile.weight + " kg" : ""],
      ["Jogo", profile.gameTitle], ["Plataforma", profile.platform], ["Clube atual", profile.currentClub],
      ["Liga", profile.league], ["Temporada", profile.season], ["Camisa", profile.shirtNumber],
      ["Posição", [profile.position, profile.secondaryPosition].filter(Boolean).join(" / ")],
      ["Pé dominante", profile.dominantFoot], ["Estilo de jogo", profile.playStyle],
      ["Clubes anteriores", profile.formerClubs], ["Personalidade", profile.personality, true],
      ["História", profile.backstory, true], ["Objetivos", profile.careerGoals, true],
      ["Tom e profundidade", [profile.storyTone, profile.depth].filter(Boolean).join(" · ")],
      ["Módulos", (profile.modules || []).join(", ")]
    ].filter(function (row) { return clean(row[1]); });
    el.profileContent.innerHTML = '<div class="profile-grid">' + rows.map(function (row) {
      return '<div class="profile-item' + (row[2] ? " profile-item--wide" : "") + '"><span>' + escapeHTML(row[0]) + '</span><strong>' + escapeHTML(row[1]) + "</strong></div>";
    }).join("") + "</div>";
  }

  function openProfile() {
    renderProfile();
    document.body.classList.add("is-modal-open");
    el.profileModal.showModal();
  }

  function closeProfile() {
    if (el.profileModal.open) el.profileModal.close();
  }

  function renderWheelEntries() {
    var career = activeCareer();
    if (!career) return;
    el.wheelEntries.innerHTML = career.tools.wheelEntries.map(function (entry, index) {
      return '<label class="wheel-entry" style="--entry-color:' + WHEEL_COLORS[index % WHEEL_COLORS.length] + '"><span></span><input type="text" maxlength="80" data-wheel-index="' + index + '" value="' + escapeHTML(entry) + '" placeholder="Possibilidade ' + (index + 1) + '" /><button type="button" data-remove-wheel="' + index + '" aria-label="Remover possibilidade">×</button></label>';
    }).join("");
    updateWheelVisual();
  }

  function updateWheelVisual() {
    var career = activeCareer();
    if (!career) return;
    var count = Math.max(2, career.tools.wheelEntries.length);
    var step = 100 / count;
    var stops = [];
    for (var i = 0; i < count; i += 1) stops.push(WHEEL_COLORS[i % WHEEL_COLORS.length] + " " + (i * step) + "% " + ((i + 1) * step) + "%");
    el.wheel.style.background = "conic-gradient(" + stops.join(",") + ")";
  }

  function addWheelEntry() {
    var career = activeCareer();
    if (!career || career.tools.wheelEntries.length >= 12) {
      toast("A roleta aceita até 12 possibilidades.", "error");
      return;
    }
    career.tools.wheelEntries.push("");
    saveState();
    renderWheelEntries();
    var inputs = el.wheelEntries.querySelectorAll("input");
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  function updateWheelEntry(event) {
    var input = event.target.closest("[data-wheel-index]");
    var career = activeCareer();
    if (!input || !career) return;
    career.tools.wheelEntries[Number(input.dataset.wheelIndex)] = input.value;
    saveState();
  }

  function removeWheelEntry(event) {
    var button = event.target.closest("[data-remove-wheel]");
    var career = activeCareer();
    if (!button || !career) return;
    if (career.tools.wheelEntries.length <= 2) {
      toast("Mantenha pelo menos duas posições na roleta.", "error");
      return;
    }
    career.tools.wheelEntries.splice(Number(button.dataset.removeWheel), 1);
    saveState();
    renderWheelEntries();
  }

  function spinWheel() {
    var career = activeCareer();
    if (!career) return;
    var options = career.tools.wheelEntries.map(clean).filter(Boolean);
    if (options.length < 2) {
      toast("Preencha pelo menos duas possibilidades.", "error");
      return;
    }
    el.spinWheel.disabled = true;
    el.useWheelResult.disabled = true;
    ui.wheelResult = "";
    el.wheelResult.textContent = "…";
    el.wheelResult.style.transform = "";
    var selected = options[randomInt(options.length)];
    ui.wheelRotation += 1440 + randomInt(720);
    el.wheel.style.transform = "rotate(" + ui.wheelRotation + "deg)";
    window.setTimeout(function () {
      ui.wheelResult = selected;
      el.wheelResult.textContent = selected;
      el.wheelResult.style.transform = "rotate(" + (-ui.wheelRotation) + "deg)";
      el.spinWheel.disabled = false;
      el.useWheelResult.disabled = false;
      toast("Resultado da roleta: " + selected);
    }, 3850);
  }

  function useWheelResult() {
    if (!ui.wheelResult) return;
    insertIntoChat("[ROLETA]\nResultado sorteado: " + ui.wheelResult + "\nInterprete este resultado somente se eu confirmar que ele vale para a cena.");
    closeTools();
  }

  function selectDie(event) {
    var button = event.target.closest("[data-die]");
    if (!button) return;
    ui.dieSides = Number(button.dataset.die);
    document.querySelectorAll("[data-die]").forEach(function (item) { item.classList.toggle("is-active", item === button); });
    el.diceResult.querySelector("span").textContent = "D" + ui.dieSides;
    el.diceResult.querySelector("strong").textContent = "—";
    el.diceResult.querySelector("p").textContent = "Aguardando rolagem";
    ui.lastDice = null;
    el.useDiceResult.disabled = true;
  }

  function rollDice() {
    var career = activeCareer();
    if (!career) return;
    var result = randomInt(ui.dieSides) + 1;
    ui.lastDice = { sides: ui.dieSides, result: result, createdAt: new Date().toISOString() };
    career.tools.diceHistory.unshift(ui.lastDice);
    career.tools.diceHistory = career.tools.diceHistory.slice(0, 16);
    el.diceResult.querySelector("strong").textContent = String(result);
    el.diceResult.querySelector("p").textContent = diceInterpretation(result, ui.dieSides);
    el.useDiceResult.disabled = false;
    saveState();
    renderDiceHistory();
  }

  function renderDiceHistory() {
    var career = activeCareer();
    if (!career) return;
    el.diceHistory.innerHTML = career.tools.diceHistory.map(function (roll) { return "<span>D" + Number(roll.sides) + " · " + Number(roll.result) + "</span>"; }).join("");
  }

  function useDiceResult() {
    if (!ui.lastDice) return;
    insertIntoChat("[ROLAGEM DE DADO]\nDado: D" + ui.lastDice.sides + "\nResultado: " + ui.lastDice.result + "\nInterprete o resultado dentro da cena sem controlar meu personagem.");
    closeTools();
  }

  function diceInterpretation(result, sides) {
    var ratio = result / sides;
    if (ratio === 1) return "Resultado máximo";
    if (ratio <= 0.15) return "Resultado muito baixo";
    if (ratio <= 0.4) return "Resultado baixo";
    if (ratio < 0.7) return "Resultado intermediário";
    return "Resultado alto";
  }

  function insertIntoChat(text) {
    navigate("kick-off");
    var existing = el.chatInput.value.trim();
    el.chatInput.value = existing ? existing + "\n\n" + text : text;
    autosizeComposer();
    el.chatInput.focus();
  }

  function openSettings() {
    ui.settingsDraft = Object.assign({}, state.settings);
    ui.settingsSaved = false;
    el.overlayRange.value = ui.settingsDraft.overlay;
    el.blurRange.value = ui.settingsDraft.blur;
    el.apiBaseUrl.value = ui.settingsDraft.apiBaseUrl || "";
    el.spotifyClientId.value = ui.settingsDraft.spotifyClientId || "";
    el.spotifyRedirectUri.value = getSpotifyRedirectUri();
    updateRangeOutputs();
    updateBackendStatus();
    document.body.classList.add("is-modal-open");
    el.settingsModal.showModal();
  }

  function previewSettings() {
    if (!ui.settingsDraft) ui.settingsDraft = Object.assign({}, state.settings);
    ui.settingsDraft.overlay = Number(el.overlayRange.value);
    ui.settingsDraft.blur = Number(el.blurRange.value);
    updateRangeOutputs();
    applyVisualSettings(ui.settingsDraft);
  }

  function updateRangeOutputs() {
    el.overlayOutput.value = el.overlayRange.value + "%";
    el.blurOutput.value = el.blurRange.value + "px";
  }

  async function importBackground(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Escolha um arquivo de imagem.", "error");
      return;
    }
    try {
      var dataUrl = await optimizeImage(file);
      if (!ui.settingsDraft) ui.settingsDraft = Object.assign({}, state.settings);
      ui.settingsDraft.backgroundData = dataUrl;
      applyVisualSettings(ui.settingsDraft);
      toast("Fundo carregado. Salve as configurações para manter.");
    } catch (error) {
      toast("Não foi possível processar essa imagem.", "error");
    } finally {
      event.target.value = "";
    }
  }

  function resetBackgroundDraft() {
    if (!ui.settingsDraft) ui.settingsDraft = Object.assign({}, state.settings);
    ui.settingsDraft.backgroundData = "";
    applyVisualSettings(ui.settingsDraft);
    toast("Fundo padrão restaurado na prévia.");
  }

  function saveSettings() {
    if (!ui.settingsDraft) ui.settingsDraft = Object.assign({}, state.settings);
    ui.settingsDraft.overlay = Number(el.overlayRange.value);
    ui.settingsDraft.blur = Number(el.blurRange.value);
    ui.settingsDraft.apiBaseUrl = clean(el.apiBaseUrl.value).replace(/\/+$/, "");
    ui.settingsDraft.spotifyClientId = clean(el.spotifyClientId.value);
    state.settings = Object.assign({}, state.settings, ui.settingsDraft);
    ui.settingsSaved = true;
    saveState();
    applyVisualSettings(state.settings);
    updateBackendStatus();
    el.settingsModal.close();
    toast("Configurações salvas.");
  }

  function applyVisualSettings(settings) {
    var safe = settings || {};
    document.documentElement.style.setProperty("--backdrop-overlay", String((Number(safe.overlay || 58) / 100).toFixed(2)));
    document.documentElement.style.setProperty("--backdrop-blur", Number(safe.blur || 0) + "px");
    el.customBackground.style.backgroundImage = safe.backgroundData ? 'url("' + safe.backgroundData + '")' : "";
  }

  function updateBackendStatus() {
    var configured = Boolean(clean((ui.settingsDraft && ui.settingsDraft.apiBaseUrl) || state.settings.apiBaseUrl));
    el.backendStatusText.textContent = configured ? "Endpoint configurado · será validado ao enviar" : "Não conectado";
    el.backendStatusText.parentElement.classList.toggle("is-connected", configured);
    setAiStatus(configured ? "BACKEND CONFIGURADO" : "INTERFACE LOCAL", configured);
  }

  function setAiStatus(label, connected) {
    el.aiStatusChip.querySelector("span").textContent = label;
    el.aiStatusChip.classList.toggle("is-connected", Boolean(connected));
  }

  function optimizeImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var image = new Image();
        image.onerror = reject;
        image.onload = function () {
          var ratio = Math.min(1, 1920 / image.naturalWidth, 1080 / image.naturalHeight);
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
          var context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/webp", 0.82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function getSpotifyRedirectUri() {
    if (window.location.protocol === "file:" || window.location.origin === "null") return "http://127.0.0.1:4173/";
    return window.location.origin + window.location.pathname;
  }

  async function beginSpotifyConnectFromSettings() {
    var clientId = clean(el.spotifyClientId.value);
    if (!clientId) {
      toast("Informe o Client ID público do Spotify.", "error");
      el.spotifyClientId.focus();
      return;
    }
    if (!ui.settingsDraft) ui.settingsDraft = Object.assign({}, state.settings);
    ui.settingsDraft.spotifyClientId = clientId;
    ui.settingsDraft.apiBaseUrl = clean(el.apiBaseUrl.value).replace(/\/+$/, "");
    state.settings = Object.assign({}, state.settings, ui.settingsDraft);
    saveState();
    await beginSpotifyConnect();
  }

  async function beginSpotifyConnect() {
    var clientId = clean(state.settings.spotifyClientId || PUBLIC_CONFIG.spotifyClientId);
    if (!clientId) {
      openSettings();
      toast("Adicione o Spotify Client ID para conectar.", "error");
      return;
    }
    if (window.location.protocol === "file:") {
      toast("Abra o site por http://127.0.0.1:4173 ou pelo GitHub Pages para conectar o Spotify.", "error");
      return;
    }
    var verifier = randomString(64);
    var oauthState = randomString(32);
    var challenge = await pkceChallenge(verifier);
    sessionStorage.setItem(SPOTIFY_VERIFIER_KEY, verifier);
    sessionStorage.setItem(SPOTIFY_STATE_KEY, oauthState);
    var params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: getSpotifyRedirectUri(),
      state: oauthState,
      scope: "user-read-currently-playing user-read-playback-state",
      code_challenge_method: "S256",
      code_challenge: challenge
    });
    window.location.assign("https://accounts.spotify.com/authorize?" + params.toString());
  }

  async function handleSpotifyCallback() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      toast("A conexão com o Spotify foi cancelada.", "error");
      cleanOAuthQuery();
      return;
    }
    var code = params.get("code");
    if (!code) return;
    var returnedState = params.get("state");
    var expectedState = sessionStorage.getItem(SPOTIFY_STATE_KEY);
    var verifier = sessionStorage.getItem(SPOTIFY_VERIFIER_KEY);
    if (!returnedState || returnedState !== expectedState || !verifier) {
      toast("A validação de segurança do Spotify falhou. Tente conectar novamente.", "error");
      cleanOAuthQuery();
      return;
    }
    try {
      var response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clean(state.settings.spotifyClientId || PUBLIC_CONFIG.spotifyClientId),
          grant_type: "authorization_code",
          code: code,
          redirect_uri: getSpotifyRedirectUri(),
          code_verifier: verifier
        })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var token = await response.json();
      storeSpotifyToken(token);
      toast("Spotify conectado.");
      await fetchSpotifyNowPlaying();
    } catch (error) {
      toast("Não foi possível concluir a conexão com o Spotify.", "error");
    } finally {
      sessionStorage.removeItem(SPOTIFY_VERIFIER_KEY);
      sessionStorage.removeItem(SPOTIFY_STATE_KEY);
      cleanOAuthQuery();
    }
  }

  function cleanOAuthQuery() {
    var cleanUrl = window.location.pathname + (window.location.hash || "");
    window.history.replaceState({}, document.title, cleanUrl);
  }

  function storeSpotifyToken(token) {
    var existing = readSpotifyToken() || {};
    var normalized = {
      access_token: token.access_token,
      refresh_token: token.refresh_token || existing.refresh_token || "",
      token_type: token.token_type || "Bearer",
      expires_at: Date.now() + Number(token.expires_in || 3600) * 1000 - 30000
    };
    sessionStorage.setItem(SPOTIFY_TOKEN_KEY, JSON.stringify(normalized));
  }

  function readSpotifyToken() {
    try {
      return JSON.parse(sessionStorage.getItem(SPOTIFY_TOKEN_KEY)) || null;
    } catch (error) {
      return null;
    }
  }

  async function validSpotifyToken() {
    var token = readSpotifyToken();
    if (!token) return null;
    if (token.expires_at > Date.now()) return token;
    if (!token.refresh_token) return null;
    try {
      var response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clean(state.settings.spotifyClientId || PUBLIC_CONFIG.spotifyClientId),
          grant_type: "refresh_token",
          refresh_token: token.refresh_token
        })
      });
      if (!response.ok) throw new Error("refresh");
      var refreshed = await response.json();
      storeSpotifyToken(refreshed);
      return readSpotifyToken();
    } catch (error) {
      disconnectSpotify(false);
      return null;
    }
  }

  async function fetchSpotifyNowPlaying() {
    var token = await validSpotifyToken();
    if (!token) {
      renderSpotifyDisconnected();
      return;
    }
    try {
      var response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: "Bearer " + token.access_token } });
      if (response.status === 204) {
        renderSpotifyIdle();
        return;
      }
      if (!response.ok) throw new Error("HTTP " + response.status);
      renderSpotifyTrack(await response.json());
    } catch (error) {
      el.spotifyStatus.textContent = "SPOTIFY CONECTADO";
      el.spotifyTrack.textContent = "SEM RESPOSTA";
      el.spotifyArtist.textContent = "A reprodução não pôde ser consultada";
      el.spotifyDisc.classList.remove("is-playing");
    }
  }

  function renderSpotifyTrack(payload) {
    var item = payload && payload.item;
    if (!item) {
      renderSpotifyIdle();
      return;
    }
    var artists = Array.isArray(item.artists) ? item.artists.map(function (artist) { return artist.name; }).join(", ") : "";
    var imageUrl = item.album && item.album.images && item.album.images[0] && item.album.images[0].url;
    el.spotifyStatus.textContent = payload.is_playing ? "TOCANDO AGORA" : "SPOTIFY PAUSADO";
    el.spotifyTrack.textContent = item.name || "Faixa sem título";
    el.spotifyArtist.textContent = artists || "Artista não informado";
    el.spotifyDisc.classList.toggle("is-playing", Boolean(payload.is_playing));
    if (imageUrl && /^https:\/\//i.test(imageUrl)) el.spotifyDisc.style.setProperty("--album-art", 'url("' + imageUrl.replace(/"/g, "%22") + '")');
  }

  function renderSpotifyIdle() {
    el.spotifyStatus.textContent = "SPOTIFY CONECTADO";
    el.spotifyTrack.textContent = "NADA TOCANDO";
    el.spotifyArtist.textContent = "Inicie uma faixa no Spotify";
    el.spotifyDisc.classList.remove("is-playing");
    el.spotifyDisc.style.removeProperty("--album-art");
  }

  function renderSpotifyDisconnected() {
    el.spotifyStatus.textContent = "SPOTIFY";
    el.spotifyTrack.textContent = "CONECTAR";
    el.spotifyArtist.textContent = "Veja aqui o que está tocando";
    el.spotifyDisc.classList.remove("is-playing");
    el.spotifyDisc.style.removeProperty("--album-art");
  }

  function disconnectSpotify(showMessage) {
    sessionStorage.removeItem(SPOTIFY_TOKEN_KEY);
    stopSpotifyPolling();
    renderSpotifyDisconnected();
    if (showMessage !== false) toast("Spotify desconectado deste navegador.");
  }

  async function spotifySidebarAction() {
    if (readSpotifyToken()) {
      await fetchSpotifyNowPlaying();
      toast("Reprodução do Spotify atualizada.");
      return;
    }
    if (clean(state.settings.spotifyClientId || PUBLIC_CONFIG.spotifyClientId)) await beginSpotifyConnect();
    else {
      openSettings();
      toast("Informe o Client ID para conectar o Spotify.");
    }
  }

  function startSpotifyPolling() {
    stopSpotifyPolling();
    if (!readSpotifyToken()) {
      renderSpotifyDisconnected();
      return;
    }
    fetchSpotifyNowPlaying();
    ui.spotifyTimer = window.setInterval(fetchSpotifyNowPlaying, 30000);
  }

  function stopSpotifyPolling() {
    if (ui.spotifyTimer) window.clearInterval(ui.spotifyTimer);
    ui.spotifyTimer = null;
  }

  function randomString(length) {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    var result = "";
    var values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (var i = 0; i < length; i += 1) result += alphabet[values[i] % alphabet.length];
    return result;
  }

  async function pkceChallenge(verifier) {
    var data = new TextEncoder().encode(verifier);
    var digest = await crypto.subtle.digest("SHA-256", data);
    return base64Url(new Uint8Array(digest));
  }

  function base64Url(bytes) {
    var binary = "";
    bytes.forEach(function (byte) { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function randomInt(max) {
    if (!Number.isFinite(max) || max <= 0) return 0;
    if (window.crypto && crypto.getRandomValues) {
      var ceiling = Math.floor(0x100000000 / max) * max;
      var value = new Uint32Array(1);
      do crypto.getRandomValues(value); while (value[0] >= ceiling);
      return value[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  async function hashText(text) {
    if (window.crypto && crypto.subtle) {
      var encoded = new TextEncoder().encode(String(text));
      var digest = await crypto.subtle.digest("SHA-256", encoded);
      return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    }
    return btoa(unescape(encodeURIComponent(String(text))));
  }

  function emptyMarkup(index, title, text) {
    return '<div class="empty-state"><span class="empty-state__index">' + escapeHTML(index) + '</span><h2>' + escapeHTML(title) + '</h2><p>' + escapeHTML(text) + "</p></div>";
  }

  function toast(message, type) {
    if (!el.toastRegion) return;
    var item = document.createElement("div");
    item.className = "toast" + (type === "error" ? " is-error" : "");
    item.textContent = message;
    el.toastRegion.appendChild(item);
    window.setTimeout(function () {
      item.style.opacity = "0";
      item.style.transform = "translateY(7px)";
      window.setTimeout(function () { item.remove(); }, 180);
    }, 3800);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        area.remove();
      }
    });
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeKey(value) {
    return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  }

  function splitCommaList(value) {
    return clean(value).split(",").map(clean).filter(Boolean);
  }

  function numberOrZero(value) {
    var number = Number(String(value == null ? "" : value).replace(",", "."));
    return Number.isFinite(number) ? number : 0;
  }

  function parseStrictNumber(value) {
    var valid = validField(value);
    if (!valid) return null;
    var number = Number(valid.replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  function plural(number, singular, pluralForm) {
    return number + " " + (Number(number) === 1 ? singular : pluralForm);
  }

  function naturalList(items) {
    if (items.length <= 1) return items[0] || "";
    return items.slice(0, -1).join(", ") + " e " + items[items.length - 1];
  }

  function formatDecimal(number) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Number(number));
  }

  function formatMoney(value, currency) {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL", maximumFractionDigits: 2 }).format(Number(value || 0));
    } catch (error) {
      return (currency || "BRL") + " " + formatDecimal(value || 0);
    }
  }

  function formatSignedMoney(value, currency) {
    var number = Number(value || 0);
    return (number > 0 ? "+ " : number < 0 ? "− " : "") + formatMoney(Math.abs(number), currency);
  }

  function formatDate(value) {
    if (!value) return "DATA NÃO INFORMADA";
    var text = String(value);
    var date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(text + "T12:00:00") : new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(".", "").toUpperCase();
  }

  function formatTime(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function formatClock(value) {
    if (!value) return "";
    if (/^\d{1,2}:\d{2}$/.test(String(value))) return String(value);
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function joinUrl(base, path) {
    return clean(base).replace(/\/+$/, "") + "/" + clean(path).replace(/^\/+/, "");
  }

  async function init() {
    cacheElements();
    bindEvents();
    applyVisualSettings(state.settings);
    populateLoginCareers();
    el.spotifyRedirectUri.value = getSpotifyRedirectUri();
    await handleSpotifyCallback();
    if (activeCareer()) startApp();
    else showAuth();
  }

  init();
})();
