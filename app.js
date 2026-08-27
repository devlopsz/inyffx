(function () {
  "use strict";

  var STORAGE_KEY = "inyffx-interface-v2";
  var SESSION_KEY = "inyffx-active-career-v2";
  var PERSISTENT_SESSION_KEY = "inyffx-remembered-career-v1";
  var SPOTIFY_TOKEN_KEY = "inyffx-spotify-token-v1";
  var SPOTIFY_VERIFIER_KEY = "inyffx-spotify-verifier-v1";
  var SPOTIFY_STATE_KEY = "inyffx-spotify-state-v1";
  var ROUTES = ["home", "kick-off", "fyx-news", "relationships", "seasons", "player-career", "off-the-pitch"];
  var HUB_BACKGROUNDS = [
    "mod/pics/background/yamal.jpg",
    "mod/pics/background/santos.jpg",
    "mod/pics/background/relationship.jpg",
    "mod/pics/background/flamengo.png",
    "mod/pics/background/chelsea.jpg"
  ];
  var REGISTRATION_QUESTIONS = Array.isArray(window.INYFFX_REGISTRATION_QUESTIONS) ? window.INYFFX_REGISTRATION_QUESTIONS : [];
  var REFERENCE_DATA = window.INYFFX_REFERENCE_DATA || {};
  var TOOL_TITLES = { match: "MODELO DE PARTIDA", wheel: "ROLETA", dice: "ROLAGEM DE DADOS" };
  var WHEEL_COLORS = ["#37484f", "#52636c", "#365c69", "#604e70", "#68704e", "#4b5d72", "#6a4f4f", "#38615c", "#5b536d", "#4f6261", "#5f6542", "#485078"];
  var PUBLIC_CONFIG = Object.assign({}, window.INYFFX_CONFIG || {}, window.INYFFX_TEST_CONFIG || {});
  var state = loadState();
  var ui = {
    authTab: "login",
    createStep: 0,
    registrationAnswers: {},
    registrationCustom: {},
    route: "home",
    newsFilter: "all",
    careerTab: "pay",
    dieSides: 20,
    lastDice: null,
    wheelResult: "",
    wheelRotation: 0,
    settingsDraft: null,
    settingsSaved: false,
    spotifyTimer: null,
    backgroundTimer: null,
    backgroundIndex: 0,
    backgroundFront: "a",
    profileEdit: "",
    pendingAvatar: "",
    sending: false
  };
  var el = {};

  function blankState() {
    return {
      version: 2,
      settings: {
        apiBaseUrl: String(PUBLIC_CONFIG.apiBaseUrl || ""),
        spotifyClientId: String(PUBLIC_CONFIG.spotifyClientId || "")
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
      if (String(PUBLIC_CONFIG.apiBaseUrl || "").trim()) parsed.settings.apiBaseUrl = String(PUBLIC_CONFIG.apiBaseUrl).trim();
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
    safe.user = Object.assign({
      username: safe.auth.username || legacyUsername(safe),
      avatarData: safe.profile.avatarData || ""
    }, safe.user || {});
    safe.user.username = normalizeUsername(safe.user.username || legacyUsername(safe));
    safe.auth.username = safe.user.username;
    safe.profileChangeHistory = Array.isArray(safe.profileChangeHistory) ? safe.profileChangeHistory : [];
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
      toast("Não foi possível salvar. A foto de perfil pode ser grande demais para este navegador.", "error");
      return false;
    }
  }

  function uid(prefix) {
    var random = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    return String(prefix || "id") + "-" + random;
  }

  function activeCareer() {
    var activeId = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(PERSISTENT_SESSION_KEY);
    return state.careers.find(function (career) { return career.id === activeId; }) || null;
  }

  function legacyUsername(career) {
    var raw = clean(career && career.auth && career.auth.email).split("@")[0] || clean(career && career.name) || "jogador";
    return normalizeUsername(raw);
  }

  function cacheElements() {
    [
      "authGate", "appShell", "loginForm", "loginCareer", "loginPasscode", "rememberCareer", "loginHint", "loginError",
      "createForm", "createError", "registrationQuestion", "registrationSection", "registrationCount", "prevStep",
      "nextStep", "createCareer", "hubSidebar", "openSettings", "openProfile", "hubAvatarImage", "hubAvatarFallback",
      "hubBackgroundA", "hubBackgroundB", "pageBack", "appMain", "chatMessages", "chatForm", "chatInput", "sendMessage",
      "sceneLabel", "newScene", "aiStatusChip", "toolDrawer", "toolTitle", "closeTools", "matchTemplateForm",
      "matchPromptTemplate", "copyMatchTemplate", "insertMatchTemplate", "wheel", "wheelResult", "wheelEntries", "addWheelEntry",
      "spinWheel", "useWheelResult", "dicePicker", "diceResult", "rollDice", "useDiceResult", "diceHistory",
      "newsFilters", "newsContent", "relationshipSearch", "relationshipCount", "relationshipsContent",
      "seasonSelect", "seasonsContent", "careerContent", "copyOffPitchTemplate", "insertOffPitchTemplate",
      "offPitchTemplate", "residenceContent", "spotifyNow", "spotifyDisc", "spotifyStatus", "spotifyTrack",
      "spotifyArtist", "settingsModal", "settingsForm", "backendStatusDot", "backendStatusText",
      "spotifyClientId", "spotifyRedirectUri", "copyRedirectUri", "disconnectSpotify", "connectSpotify",
      "saveSettings", "profilePage", "profileContent", "profileAvatarImage", "profileAvatarFallback", "profileIdentityLine",
      "closeProfile", "logoutCareer", "toastRegion"
    ].forEach(function (id) { el[id] = document.getElementById(id); });
  }

  function bindEvents() {
    document.querySelectorAll("[data-switch-auth]").forEach(function (button) {
      button.addEventListener("click", function () { setAuthTab(button.dataset.switchAuth); });
    });
    el.prevStep.addEventListener("click", previousRegistrationQuestion);
    el.nextStep.addEventListener("click", continueRegistration);
    el.createForm.addEventListener("submit", createCareerFromForm);
    el.registrationQuestion.addEventListener("click", handleRegistrationClick);
    el.registrationQuestion.addEventListener("input", handleRegistrationInput);
    el.registrationQuestion.addEventListener("change", handleRegistrationChange);
    el.loginForm.addEventListener("submit", loginToCareer);
    document.querySelectorAll("[data-route]").forEach(function (button) {
      button.addEventListener("click", function () { navigate(button.dataset.route); });
    });
    window.addEventListener("hashchange", routeFromHash);
    el.pageBack.addEventListener("click", function () { navigate("home"); });
    el.openSettings.addEventListener("click", openSettings);
    el.openProfile.addEventListener("click", openProfile);
    el.closeProfile.addEventListener("click", closeProfile);
    el.logoutCareer.addEventListener("click", logout);
    el.profileContent.addEventListener("click", handleProfileClick);
    el.profileContent.addEventListener("change", handleProfileChange);
    el.profileContent.addEventListener("submit", saveProfileForm);
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
      ui.settingsDraft = null;
    });
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
    document.querySelectorAll("[data-auth-panel]").forEach(function (panel) {
      panel.classList.toggle("is-active", panel.dataset.authPanel === ui.authTab);
    });
    el.loginError.textContent = "";
    el.createError.textContent = "";
    if (ui.authTab === "create") {
      setCreateStep(ui.createStep);
    } else {
      window.setTimeout(function () { el.loginCareer.focus(); }, 80);
    }
  }

  function setCreateStep(step) {
    var questions = visibleRegistrationQuestions();
    ui.createStep = Math.max(0, Math.min(Math.max(0, questions.length - 1), Number(step) || 0));
    el.createError.textContent = "";
    renderRegistrationQuestion();
  }

  function visibleRegistrationQuestions() {
    return REGISTRATION_QUESTIONS.filter(function (question) {
      if (!question.when) return true;
      var current = ui.registrationAnswers[question.when.key];
      if (Object.prototype.hasOwnProperty.call(question.when, "equals")) return current === question.when.equals;
      if (Object.prototype.hasOwnProperty.call(question.when, "notEquals")) return current !== question.when.notEquals;
      return true;
    });
  }

  function currentRegistrationQuestion() {
    return visibleRegistrationQuestions()[ui.createStep] || null;
  }

  function registrationOptions(question) {
    var options = Array.isArray(question.options) ? question.options.slice() : (Array.isArray(REFERENCE_DATA[question.source]) ? REFERENCE_DATA[question.source].slice() : []);
    if (Array.isArray(question.excludeKeys)) {
      var excluded = [];
      question.excludeKeys.forEach(function (key) {
        var value = ui.registrationAnswers[key];
        if (Array.isArray(value)) excluded = excluded.concat(value);
      });
      options = options.filter(function (option) { return excluded.indexOf(option) < 0; });
    }
    if (question.source === "cities" && question.dependsOn && ui.registrationAnswers[question.dependsOn]) {
      var country = normalizeKey(ui.registrationAnswers[question.dependsOn]);
      options.sort(function (a, b) {
        var aMatch = normalizeKey(a).indexOf(country) >= 0 ? 0 : 1;
        var bMatch = normalizeKey(b).indexOf(country) >= 0 ? 0 : 1;
        return aMatch - bMatch || a.localeCompare(b, "pt-BR");
      });
    }
    return options;
  }

  function renderRegistrationQuestion() {
    var questions = visibleRegistrationQuestions();
    var question = questions[ui.createStep];
    if (!question) {
      el.registrationQuestion.innerHTML = '<h1>Não foi possível carregar o cadastro.</h1>';
      el.nextStep.hidden = true;
      return;
    }
    el.registrationSection.textContent = question.section;
    el.registrationCount.textContent = (ui.createStep + 1) + " / " + questions.length;
    el.prevStep.hidden = ui.createStep === 0;
    el.nextStep.hidden = question.type === "review";
    el.createCareer.hidden = question.type !== "review";
    var value = ui.registrationAnswers[question.key];
    var optional = question.required ? "" : '<span class="question-optional">OPCIONAL</span>';
    var control = renderRegistrationControl(question, value);
    el.registrationQuestion.innerHTML = [
      '<div class="question-heading"><span>', escapeHTML(question.section), "</span>", optional, "<h1>", escapeHTML(question.prompt), "</h1></div>",
      control,
      question.hint ? '<p class="question-hint">' + escapeHTML(question.hint) + "</p>" : ""
    ].join("");
    window.scrollTo({ top: 0, behavior: "instant" });
    window.setTimeout(function () {
      var input = el.registrationQuestion.querySelector("input:not([type=checkbox]), textarea");
      if (input && question.type !== "file") input.focus();
    }, 60);
  }

  function renderRegistrationControl(question, value) {
    var safeValue = Array.isArray(value) ? value : clean(value);
    var common = ' data-registration-input="' + escapeHTML(question.key) + '" name="' + escapeHTML(question.key) + '"';
    if (question.type === "select") {
      return '<div class="question-choices">' + registrationOptions(question).map(function (option) {
        return '<button type="button" class="question-choice' + (safeValue === option ? " is-selected" : "") + '" data-registration-choice="' + escapeHTML(option) + '"><span>' + escapeHTML(option) + "</span><i>→</i></button>";
      }).join("") + "</div>";
    }
    if (question.type === "multi") {
      var selected = Array.isArray(value) ? value : [];
      return '<div class="question-multi">' + registrationOptions(question).map(function (option) {
        return '<button type="button" class="multi-choice' + (selected.indexOf(option) >= 0 ? " is-selected" : "") + '" data-registration-multi="' + escapeHTML(option) + '"><span>' + escapeHTML(option) + "</span><i>✓</i></button>";
      }).join("") + "</div>";
    }
    if (question.type === "textarea") {
      return '<label class="wizard-input wizard-input--textarea"><textarea' + common + ' maxlength="' + Number(question.maxLength || 3000) + '" placeholder="' + escapeHTML(question.placeholder || "Escreva aqui") + '">' + escapeHTML(safeValue) + "</textarea></label>";
    }
    if (question.type === "autocomplete") {
      var exact = registrationOptions(question).some(function (option) { return normalizeKey(option) === normalizeKey(safeValue); });
      var unmatched = Boolean(safeValue) && !exact;
      return [
        '<div class="wizard-autocomplete"><label class="wizard-input"><input type="text"', common, ' value="', escapeHTML(safeValue), '" placeholder="', escapeHTML(question.placeholder || "Comece a digitar"), '" autocomplete="off" aria-autocomplete="list" /></label>',
        '<div class="autocomplete-suggestions" data-registration-suggestions></div>',
        '<div class="autocomplete-manual', unmatched ? " is-visible" : "", '" data-autocomplete-manual-wrap><p>Essa opção não foi encontrada ou não existe.</p><label><input type="checkbox" data-registration-manual ', ui.registrationCustom[question.key] ? "checked" : "", ' /><span>Seguir mesmo assim</span></label></div></div>'
      ].join("");
    }
    if (question.type === "file") {
      var preview = clean(value) ? '<img src="' + escapeHTML(value) + '" alt="Prévia da foto do jogador" />' : '<span class="photo-upload__placeholder">+</span>';
      return '<label class="photo-upload">' + preview + '<strong>' + (clean(value) ? "TROCAR FOTO" : "ESCOLHER FOTO") + '</strong><input type="file"' + common + ' accept="' + escapeHTML(question.accept || "image/*") + '" /></label><button class="skip-photo" type="button" data-skip-photo>Fazer depois</button>';
    }
    if (question.type === "review") return renderRegistrationReview();
    var type = question.type === "username" ? "text" : question.type;
    var attrs = [
      question.placeholder ? ' placeholder="' + escapeHTML(question.placeholder) + '"' : "",
      question.minLength ? ' minlength="' + Number(question.minLength) + '"' : "",
      question.maxLength ? ' maxlength="' + Number(question.maxLength) + '"' : "",
      question.min !== undefined ? ' min="' + Number(question.min) + '"' : "",
      question.max !== undefined ? ' max="' + Number(question.max) + '"' : "",
      question.type === "username" ? ' autocapitalize="none" spellcheck="false" autocomplete="username"' : "",
      question.type === "password" ? ' autocomplete="new-password"' : ""
    ].join("");
    return '<label class="wizard-input"><input type="' + escapeHTML(type) + '"' + common + ' value="' + escapeHTML(safeValue) + '"' + attrs + ' />' + (question.suffix ? '<span class="wizard-input__suffix">' + escapeHTML(question.suffix) + "</span>" : "") + "</label>";
  }

  function renderRegistrationReview() {
    var answers = ui.registrationAnswers;
    var identity = [
      ["Nome completo", answers.playerName], ["Nome na camisa", answers.shirtName],
      ["Data de nascimento", answers.birthDate ? formatDate(answers.birthDate) : ""], ["Idade", answers.birthDate ? calculateAge(answers.birthDate) + " anos" : ""],
      ["Nacionalidade(s)", [answers.primaryNationality, answers.secondNationality, answers.thirdNationality].filter(Boolean).join(", ")]
    ];
    var origin = [["Nascimento", [answers.birthCity, answers.birthCountry].filter(Boolean).join(" · ")], ["Onde vive", [answers.currentCity, answers.currentCountry].filter(Boolean).join(" · ")]];
    var career = [["Situação", answers.footballStatus], ["Clube", answers.currentClub], ["Liga", answers.league], ["Temporada", answers.season], ["Categoria", answers.squadCategory], ["Camisa", answers.shirtNumber]];
    var profile = [["Posição", answers.position], ["Outras posições", registrationValue(answers.secondaryPositions)], ["Pé dominante", answers.dominantFoot], ["Altura", answers.height ? answers.height + " cm" : ""], ["Peso", answers.weight ? answers.weight + " kg" : ""], ["Estilo", registrationValue(answers.playStyle)], ["Forças", registrationValue([].concat(answers.technicalStrengths || [], answers.mentalStrengths || [], answers.physicalStrengths || []))], ["Fraquezas", registrationValue(answers.weaknesses)]];
    var narrative = [["Personalidade", answers.personality], ["Ambição", answers.careerAmbition], ["História", answers.backstory]];
    return '<div class="registration-review">' + reviewSection("IDENTIDADE", identity) + reviewSection("ORIGEM", origin) + reviewSection("CARREIRA", career) + reviewSection("PERFIL", profile) + reviewSection("NARRATIVA", narrative) + '<label class="review-confirm"><input type="checkbox" data-registration-confirm ' + (answers.confirmed ? "checked" : "") + ' /><span>Confirmo que as informações do personagem estão corretas.</span></label></div>';
  }

  function reviewSection(title, rows) {
    return '<section><h2>' + escapeHTML(title) + '</h2><div class="review-grid">' + rows.filter(function (row) { return clean(row[1]); }).map(function (row) { return '<div><span>' + escapeHTML(row[0]) + '</span><strong>' + escapeHTML(row[1]) + "</strong></div>"; }).join("") + "</div></section>";
  }

  function registrationValue(value) {
    return Array.isArray(value) ? value.join(", ") : clean(value);
  }

  function previousRegistrationQuestion() {
    saveCurrentRegistrationAnswer();
    setCreateStep(ui.createStep - 1);
  }

  function continueRegistration() {
    saveCurrentRegistrationAnswer();
    if (!validateCurrentRegistrationQuestion()) return;
    setCreateStep(ui.createStep + 1);
  }

  function saveCurrentRegistrationAnswer() {
    var question = currentRegistrationQuestion();
    if (!question || question.type === "select" || question.type === "multi" || question.type === "file") return;
    if (question.type === "review") {
      var confirmation = el.registrationQuestion.querySelector("[data-registration-confirm]");
      ui.registrationAnswers.confirmed = Boolean(confirmation && confirmation.checked);
      return;
    }
    var input = el.registrationQuestion.querySelector("[data-registration-input]");
    if (!input) return;
    ui.registrationAnswers[question.key] = question.type === "username" ? normalizeUsername(input.value) : clean(input.value);
    if (question.type === "autocomplete") {
      var manual = el.registrationQuestion.querySelector("[data-registration-manual]");
      ui.registrationCustom[question.key] = Boolean(manual && manual.checked);
    }
  }

  function validateCurrentRegistrationQuestion() {
    var question = currentRegistrationQuestion();
    if (!question) return false;
    var value = ui.registrationAnswers[question.key];
    var missing = Array.isArray(value) ? value.length === 0 : !clean(value);
    el.createError.textContent = "";
    if (question.required && missing) return registrationError(question.type === "review" ? "Confirme que as informações estão corretas." : "Responda esta pergunta para continuar.");
    if (missing) return true;
    if (question.type === "username") {
      if (!/^@[a-z0-9._]{3,30}$/.test(value)) return registrationError("Use @ no início e de 3 a 30 letras, números, pontos ou underlines.");
      if (state.careers.some(function (career) { return normalizeUsername(career.user && career.user.username) === value; })) return registrationError("Este nome de usuário já está em uso neste navegador.");
    }
    if (question.key === "password" && String(value).length < 6) return registrationError("A senha precisa ter pelo menos 6 caracteres.");
    if (question.key === "confirmPassword" && value !== ui.registrationAnswers.password) return registrationError("As senhas não coincidem.");
    if (question.minLength && String(value).length < question.minLength) return registrationError("Use pelo menos " + question.minLength + " caracteres.");
    if (question.maxLength && String(value).length > question.maxLength) return registrationError("Use no máximo " + question.maxLength + " caracteres.");
    if (question.type === "number") {
      var number = Number(value);
      if (!Number.isFinite(number) || (question.min !== undefined && number < question.min) || (question.max !== undefined && number > question.max)) return registrationError("Informe um valor válido entre " + question.min + " e " + question.max + ".");
    }
    if (question.type === "autocomplete") {
      var exact = registrationOptions(question).some(function (option) { return normalizeKey(option) === normalizeKey(value); });
      if (!exact && !ui.registrationCustom[question.key]) return registrationError("Essa opção não foi encontrada ou não existe. Marque “Seguir mesmo assim” para usar o texto digitado.");
    }
    if (question.key === "secondNationality" && normalizeKey(value) === normalizeKey(ui.registrationAnswers.primaryNationality)) return registrationError("A segunda nacionalidade precisa ser diferente da principal.");
    if (question.key === "thirdNationality" && [ui.registrationAnswers.primaryNationality, ui.registrationAnswers.secondNationality].some(function (item) { return normalizeKey(item) === normalizeKey(value); })) return registrationError("A terceira nacionalidade precisa ser diferente das anteriores.");
    if (question.key === "secondaryPositions" && value.indexOf(ui.registrationAnswers.position) >= 0) return registrationError("Não repita a posição principal entre as posições secundárias.");
    if (question.key === "shirtNumber" && !/^([1-9]|[1-9][0-9])$/.test(value) && normalizeKey(value) !== "nao definido") return registrationError("Informe um número de 1 a 99 ou escreva “Não definido”.");
    return true;
  }

  function registrationError(message) {
    el.createError.textContent = message;
    return false;
  }

  function handleRegistrationClick(event) {
    var choice = event.target.closest("[data-registration-choice]");
    var multi = event.target.closest("[data-registration-multi]");
    var suggestion = event.target.closest("[data-registration-suggestion]");
    var skipPhoto = event.target.closest("[data-skip-photo]");
    var question = currentRegistrationQuestion();
    if (!question) return;
    if (choice) {
      ui.registrationAnswers[question.key] = choice.dataset.registrationChoice;
      if (question.key === "hasSecondNationality" && choice.dataset.registrationChoice === "Não") {
        delete ui.registrationAnswers.secondNationality;
        delete ui.registrationAnswers.hasThirdNationality;
        delete ui.registrationAnswers.thirdNationality;
      }
      if (question.key === "hasThirdNationality" && choice.dataset.registrationChoice === "Não") delete ui.registrationAnswers.thirdNationality;
      renderRegistrationQuestion();
      return;
    }
    if (multi) {
      var selected = Array.isArray(ui.registrationAnswers[question.key]) ? ui.registrationAnswers[question.key].slice() : [];
      var option = multi.dataset.registrationMulti;
      var index = selected.indexOf(option);
      if (index >= 0) selected.splice(index, 1);
      else if (selected.length >= Number(question.max || 99)) return void toast("Você pode escolher até " + question.max + " opções.", "error");
      else selected.push(option);
      if (option === "Não" && selected.indexOf("Não") >= 0) selected = ["Não"];
      else if (option !== "Não") selected = selected.filter(function (item) { return item !== "Não"; });
      ui.registrationAnswers[question.key] = selected;
      renderRegistrationQuestion();
      return;
    }
    if (suggestion) {
      ui.registrationAnswers[question.key] = suggestion.dataset.registrationSuggestion;
      ui.registrationCustom[question.key] = false;
      renderRegistrationQuestion();
      return;
    }
    if (skipPhoto) {
      ui.registrationAnswers.avatarData = "";
      continueRegistration();
    }
  }

  function handleRegistrationInput(event) {
    var input = event.target.closest("[data-registration-input]");
    var question = currentRegistrationQuestion();
    if (!input || !question) return;
    if (question.type === "username") {
      var normalized = normalizeUsername(input.value);
      if (input.value !== normalized) input.value = normalized;
      ui.registrationAnswers[question.key] = normalized;
    } else if (question.type !== "file") ui.registrationAnswers[question.key] = input.value;
    if (question.type === "autocomplete") {
      ui.registrationCustom[question.key] = false;
      renderAutocompleteSuggestions(question, input.value);
    }
    el.createError.textContent = "";
  }

  async function handleRegistrationChange(event) {
    var fileInput = event.target.closest('input[type="file"][data-registration-input]');
    var manual = event.target.closest("[data-registration-manual]");
    var confirm = event.target.closest("[data-registration-confirm]");
    var question = currentRegistrationQuestion();
    if (manual && question) ui.registrationCustom[question.key] = manual.checked;
    if (confirm) ui.registrationAnswers.confirmed = confirm.checked;
    if (!fileInput || !question) return;
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      ui.registrationAnswers.avatarData = await optimizeImage(file, 720, 720, 0.8);
      renderRegistrationQuestion();
      toast("Foto adicionada ao perfil.");
    } catch (error) {
      registrationError("Não foi possível processar essa imagem.");
    }
  }

  function renderAutocompleteSuggestions(question, rawValue) {
    var list = el.registrationQuestion.querySelector("[data-registration-suggestions]");
    var manualWrap = el.registrationQuestion.querySelector("[data-autocomplete-manual-wrap]");
    if (!list) return;
    var query = normalizeKey(rawValue);
    var minimum = question.source === "countries" || question.source === "nationalities" ? 1 : 2;
    var exact = registrationOptions(question).some(function (option) { return normalizeKey(option) === query; });
    var matches = query.length >= minimum ? registrationOptions(question).filter(function (option) { return normalizeKey(option).indexOf(query) >= 0; }).slice(0, 10) : [];
    list.innerHTML = matches.map(function (option) { return '<button type="button" data-registration-suggestion="' + escapeHTML(option) + '">' + escapeHTML(option) + "</button>"; }).join("");
    list.classList.toggle("is-visible", matches.length > 0 && !exact);
    if (manualWrap) manualWrap.classList.toggle("is-visible", Boolean(rawValue) && !exact && matches.length === 0);
  }

  async function createCareerFromForm(event) {
    event.preventDefault();
    saveCurrentRegistrationAnswer();
    if (!validateCurrentRegistrationQuestion() || !ui.registrationAnswers.confirmed) return;
    var answers = ui.registrationAnswers;
    var username = normalizeUsername(answers.username);
    if (state.careers.some(function (career) { return normalizeUsername(career.user && career.user.username) === username; })) return registrationError("Este nome de usuário já está em uso neste navegador.");
    el.createCareer.disabled = true;
    el.createCareer.textContent = "CRIANDO UNIVERSO...";
    try {
      var profile = Object.assign({}, answers, {
        nationality: [answers.primaryNationality, answers.secondNationality, answers.thirdNationality].filter(Boolean).join(", "),
        secondaryPosition: registrationValue(answers.secondaryPositions),
        playStyle: registrationValue(answers.playStyle),
        careerGoals: [answers.careerAmbition, answers.nextSeasonGoal].filter(Boolean).join(" · "),
        modules: ["football", "media", "relationships", "offpitch"]
      });
      delete profile.username;
      delete profile.password;
      delete profile.confirmPassword;
      delete profile.confirmed;
      var career = normalizeCareer({
        id: uid("career"),
        name: (answers.playerName || "Carreira") + (answers.season ? " — " + answers.season : ""),
        user: { username: username, avatarData: answers.avatarData || "" },
        auth: { username: username, email: "", passHash: await hashText(answers.password) },
        profile: profile,
        messages: [], canonEvents: [], news: [], characters: [], seasons: [],
        finance: { initialized: false, currency: "BRL", balance: 0, transactions: [], pockets: [] },
        hall: { trophies: [], records: [], awards: [] }, calendar: [],
        offPitch: { currentCity: answers.currentCity || "", currentResidence: "", houses: [] },
        tools: { wheelEntries: ["", ""], diceHistory: [] }, sceneNumber: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
      state.careers.push(career);
      if (!saveState()) throw new Error("storage");
      sessionStorage.setItem(SESSION_KEY, career.id);
      localStorage.removeItem(PERSISTENT_SESSION_KEY);
      ui.registrationAnswers = {};
      ui.registrationCustom = {};
      ui.createStep = 0;
      window.location.hash = "home";
      startApp();
      toast("Carreira criada. Vamos aquecer.");
    } catch (error) {
      el.createError.textContent = "Não foi possível criar a carreira neste navegador.";
    } finally {
      el.createCareer.disabled = false;
      el.createCareer.innerHTML = "VAMOS AQUECER <span>→</span>";
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
    var username = normalizeUsername(el.loginCareer.value);
    el.loginCareer.value = username;
    var career = state.careers.find(function (item) {
      return normalizeUsername(item.user && item.user.username) === username || normalizeKey(item.name) === normalizeKey(el.loginCareer.value);
    });
    if (!career) {
      el.loginError.textContent = "Nome de usuário não encontrado neste navegador.";
      return;
    }
    var candidate = await hashText(el.loginPasscode.value);
    if (candidate !== career.auth.passHash) {
      el.loginError.textContent = "Código de acesso incorreto.";
      return;
    }
    sessionStorage.setItem(SESSION_KEY, career.id);
    if (el.rememberCareer.checked) localStorage.setItem(PERSISTENT_SESSION_KEY, career.id);
    else localStorage.removeItem(PERSISTENT_SESSION_KEY);
    el.loginPasscode.value = "";
    window.location.hash = "home";
    startApp();
  }

  function populateLoginCareers() {
    if (!state.careers.length) {
      el.loginHint.textContent = "Nenhuma carreira foi criada neste navegador ainda.";
      return;
    }
    el.loginHint.textContent = "Disponível neste navegador: " + state.careers.map(function (career) { return career.user.username; }).join(", ");
  }

  function showAuth() {
    el.appShell.hidden = true;
    el.authGate.hidden = false;
    populateLoginCareers();
    setAuthTab("login");
  }

  function startApp() {
    var career = activeCareer();
    if (!career) {
      showAuth();
      return;
    }
    el.authGate.hidden = true;
    el.appShell.hidden = false;
    startHubSlideshow();
    renderAll();
    routeFromHash();
    startSpotifyPolling();
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PERSISTENT_SESSION_KEY);
    closeProfile();
    closeTools();
    stopHubSlideshow();
    stopSpotifyPolling();
    showAuth();
    window.location.hash = "";
    toast("Você saiu da carreira.");
  }

  function navigate(route) {
    var target = ROUTES.indexOf(route) >= 0 ? route : "home";
    if (window.location.hash.slice(1) !== target) window.location.hash = target;
    else activateRoute(target);
  }

  function routeFromHash() {
    var requested = window.location.hash.replace(/^#/, "");
    activateRoute(ROUTES.indexOf(requested) >= 0 ? requested : "home");
  }

  function activateRoute(route) {
    ui.route = route;
    document.querySelectorAll("[data-page]").forEach(function (page) { page.classList.toggle("is-active", page.dataset.page === route); });
    document.querySelectorAll("[data-route]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.route === route); });
    el.appShell.classList.toggle("is-page-open", route !== "home");
    el.appShell.dataset.route = route;
    if (route !== "kick-off") closeTools();
    if (route !== "home") renderRoute(route);
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

  function startHubSlideshow() {
    stopHubSlideshow();
    if (!el.hubBackgroundA || !el.hubBackgroundB || !HUB_BACKGROUNDS.length) return;
    ui.backgroundIndex = 0;
    ui.backgroundFront = "a";
    el.hubBackgroundA.style.backgroundImage = 'url("' + HUB_BACKGROUNDS[0] + '")';
    el.hubBackgroundA.classList.add("is-visible");
    el.hubBackgroundB.classList.remove("is-visible");
    HUB_BACKGROUNDS.slice(1).forEach(function (source) { var image = new Image(); image.src = source; });
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ui.backgroundTimer = window.setInterval(advanceHubBackground, 9000);
  }

  function advanceHubBackground() {
    ui.backgroundIndex = (ui.backgroundIndex + 1) % HUB_BACKGROUNDS.length;
    var incoming = ui.backgroundFront === "a" ? el.hubBackgroundB : el.hubBackgroundA;
    var outgoing = ui.backgroundFront === "a" ? el.hubBackgroundA : el.hubBackgroundB;
    incoming.style.backgroundImage = 'url("' + HUB_BACKGROUNDS[ui.backgroundIndex] + '")';
    incoming.classList.add("is-visible");
    outgoing.classList.remove("is-visible");
    ui.backgroundFront = ui.backgroundFront === "a" ? "b" : "a";
  }

  function stopHubSlideshow() {
    if (ui.backgroundTimer) window.clearInterval(ui.backgroundTimer);
    ui.backgroundTimer = null;
  }

  function renderAvatar(career) {
    var avatar = clean(career.user && career.user.avatarData) || clean(career.profile && career.profile.avatarData);
    var initials = playerInitials(career.profile && career.profile.playerName);
    [el.hubAvatarImage, el.profileAvatarImage].forEach(function (image) {
      if (!image) return;
      image.hidden = !avatar;
      if (avatar) image.src = avatar;
      else image.removeAttribute("src");
    });
    [el.hubAvatarFallback, el.profileAvatarFallback].forEach(function (fallback) {
      if (!fallback) return;
      fallback.hidden = Boolean(avatar);
      fallback.textContent = initials;
    });
    if (el.profileIdentityLine) el.profileIdentityLine.textContent = (career.user.username || "@jogador") + " · " + (career.profile.playerName || "Jogador");
  }

  function playerInitials(name) {
    var parts = clean(name).split(/\s+/).filter(Boolean);
    if (!parts.length) return "IX";
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "")).toLocaleUpperCase("pt-BR");
  }

  function renderAll() {
    var career = activeCareer();
    if (!career) return;
    renderAvatar(career);
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
    var requestTimer = null;
    try {
      var controller = new AbortController();
      requestTimer = window.setTimeout(function () { controller.abort(); }, 90000);
      var response = await fetch(joinUrl(apiBaseUrl, "/v1/roleplay/message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          schemaVersion: "1.0",
          careerId: career.id,
          message: { id: userMessage.id, content: userMessage.content, scene: userMessage.scene, createdAt: userMessage.createdAt },
          context: buildBackendContext(career)
        })
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        var apiError = new Error((payload.error && payload.error.message) || "HTTP " + response.status);
        apiError.code = payload.error && payload.error.code;
        throw apiError;
      }
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
      if (error && error.code === "RATE_LIMITED") {
        setAiStatus("LIMITE TEMPORÁRIO", false);
        toast("Muitas mensagens em pouco tempo. Sua mensagem foi salva; aguarde um minuto e tente novamente.", "error");
      } else if (error && error.code === "FREE_TIER_UNAVAILABLE") {
        setAiStatus("COTA GRATUITA INDISPONÍVEL", false);
        toast("A franquia gratuita da IA está indisponível agora. Sua mensagem foi salva para continuar depois.", "error");
      } else if (error && error.name === "AbortError") {
        setAiStatus("TEMPO ESGOTADO", false);
        toast("A IA demorou mais que o esperado. Sua mensagem continua salva e você pode tentar novamente.", "error");
      } else {
        setAiStatus("FALHA NA CONEXÃO", false);
        toast((error && error.message) || "A mensagem foi salva, mas o backend não respondeu.", "error");
      }
    } finally {
      if (requestTimer) window.clearTimeout(requestTimer);
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
    var currentSeason = career.seasons.find(function (season) { return season.label === career.profile.season; }) || career.seasons[career.seasons.length - 1] || null;
    return {
      profile: career.profile,
      profileRevision: career.profileRevision || null,
      scene: career.sceneNumber,
      recentMessages: career.messages.slice(-12).map(function (message) {
        return { role: message.role, content: message.content, createdAt: message.createdAt };
      }),
      memory: {
        canonEvents: career.canonEvents.slice(-18),
        characters: career.characters.slice(-24),
        recentNews: career.news.slice(-8),
        currentSeason: currentSeason ? Object.assign({}, currentSeason, { matches: (currentSeason.matches || []).slice(-10) }) : null,
        finance: Object.assign({}, career.finance, { transactions: career.finance.transactions.slice(-12), pockets: career.finance.pockets.slice(-12) }),
        hall: career.hall,
        calendar: career.calendar.slice(-16),
        offPitch: career.offPitch
      },
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
    var career = activeCareer();
    var playerName = career && career.profile.playerName ? career.profile.playerName : "nome do seu jogador";
    return String(el.matchPromptTemplate.textContent || "").replace("(nome do seu jogador)", playerName).trim();
  }

  function registerMatchFromMessage(career, message) {
    var fields = parseTaggedBlock(message.content, "PARTIDA OFICIAL");
    var looseTemplate = false;
    if (!fields && /^Jogo\s*:/im.test(message.content) && /^Placar final\s*:/im.test(message.content)) {
      fields = parseLooseFields(message.content);
      looseTemplate = true;
    }
    if (!fields) return false;
    var homeTeam = validField(fieldValue(fields, "mandante"));
    var awayTeam = validField(fieldValue(fields, "visitante"));
    var homeScore = parseStrictNumber(fieldValue(fields, "gols do mandante"));
    var awayScore = parseStrictNumber(fieldValue(fields, "gols do visitante"));
    if (looseTemplate) {
      var game = fieldValue(fields, "jogo");
      var scoreLine = fieldValue(fields, "placar final");
      var gameMatch = game.match(/^(.+?)\s+(?:x|×|vs\.?|versus)\s+(.+)$/i);
      var scoreMatch = scoreLine.match(/(\d+)\s*(?:x|×|[-–])\s*(\d+)/i);
      if (gameMatch) { homeTeam = clean(gameMatch[1]); awayTeam = clean(gameMatch[2]); }
      if (scoreMatch) { homeScore = Number(scoreMatch[1]); awayScore = Number(scoreMatch[2]); }
    }
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
      goals: looseTemplate ? looseGoalCount(fields) : numberOrZero(fieldValue(fields, "gols do meu jogador")),
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

  function parseLooseFields(text) {
    var fields = {};
    var currentKey = "";
    String(text).split(/\r?\n/).forEach(function (line) {
      var keyMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (keyMatch) {
        currentKey = normalizeKey(keyMatch[1]);
        fields[currentKey] = clean(keyMatch[2]);
      } else if (currentKey && clean(line)) fields[currentKey] = clean((fields[currentKey] ? fields[currentKey] + "\n" : "") + line);
    });
    return fields;
  }

  function looseGoalCount(fields) {
    var key = Object.keys(fields).find(function (item) { return item.indexOf("gols do ") === 0; });
    if (!key) return 0;
    var direct = parseStrictNumber(fields[key]);
    if (direct !== null) return direct;
    var matches = String(fields[key]).match(/\b\d{1,3}(?:'|min|\s*-)/gi);
    return matches ? matches.length : 0;
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
    renderAvatar(career);
    var profile = career.profile;
    if (ui.profileEdit === "user") {
      el.profileContent.innerHTML = renderUserProfileForm(career);
      return;
    }
    if (ui.profileEdit === "player") {
      el.profileContent.innerHTML = renderPlayerProfileForm(career);
      return;
    }
    var rows = [
      ["Nome completo", profile.playerName], ["Nome na camisa", profile.shirtName],
      ["Nascimento", profile.birthDate ? formatDate(profile.birthDate) : ""], ["Idade", profile.birthDate ? calculateAge(profile.birthDate) + " anos" : ""], ["Nacionalidade", profile.nationality],
      ["Cidade natal", profile.birthCity], ["Onde vive", [profile.currentCity, profile.currentCountry].filter(Boolean).join(" · ")],
      ["Altura", profile.height ? profile.height + " cm" : ""], ["Peso", profile.weight ? profile.weight + " kg" : ""],
      ["Jogo", profile.gameTitle], ["Plataforma", profile.platform], ["Clube atual", profile.currentClub],
      ["Liga", profile.league], ["Temporada", profile.season], ["Camisa", profile.shirtNumber],
      ["Posição", [profile.position, profile.secondaryPosition].filter(Boolean).join(" / ")],
      ["Pé dominante", profile.dominantFoot], ["Estilo de jogo", profile.playStyle],
      ["Pontos fortes técnicos", registrationValue(profile.technicalStrengths), true],
      ["Pontos fortes mentais", registrationValue(profile.mentalStrengths), true],
      ["Pontos fortes físicos", registrationValue(profile.physicalStrengths), true],
      ["Fraquezas", registrationValue(profile.weaknesses), true], ["Personalidade", profile.personality, true],
      ["História", profile.backstory, true], ["Objetivos", profile.careerGoals, true]
    ].filter(function (row) { return clean(row[1]); });
    el.profileContent.innerHTML = [
      '<section class="profile-section profile-section--user"><header><div><span>CONTA</span><h2>PERFIL DO USUÁRIO</h2></div><button type="button" data-profile-edit="user">EDITAR</button></header><div class="profile-user-summary"><strong>', escapeHTML(career.user.username || "@jogador"), '</strong><span>Carreira salva neste navegador</span></div></section>',
      '<section class="profile-section"><header><div><span>PERSONAGEM</span><h2>FICHA DO JOGADOR</h2></div><button type="button" data-profile-edit="player">EDITAR</button></header><div class="profile-grid">',
      rows.map(function (row) { return '<div class="profile-item' + (row[2] ? " profile-item--wide" : "") + '"><span>' + escapeHTML(row[0]) + '</span><strong>' + escapeHTML(row[1]) + "</strong></div>"; }).join(""),
      "</div></section>"
    ].join("");
  }

  function openProfile() {
    ui.profileEdit = "";
    ui.pendingAvatar = "";
    renderProfile();
    el.profilePage.hidden = false;
    el.appShell.classList.add("is-profile-open");
    document.body.classList.add("is-modal-open");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function closeProfile() {
    if (!el.profilePage) return;
    el.profilePage.hidden = true;
    el.appShell.classList.remove("is-profile-open");
    document.body.classList.remove("is-modal-open");
    ui.profileEdit = "";
    ui.pendingAvatar = "";
    if (activeCareer()) navigate("home");
  }

  function renderUserProfileForm(career) {
    return [
      '<form class="profile-edit-form" id="userProfileForm"><header><div><span>EDIÇÃO</span><h2>PERFIL DO USUÁRIO</h2></div></header>',
      '<label class="profile-edit-avatar"><span class="profile-edit-avatar__preview">', clean(ui.pendingAvatar || career.user.avatarData) ? '<img src="' + escapeHTML(ui.pendingAvatar || career.user.avatarData) + '" alt="Prévia da foto" />' : escapeHTML(playerInitials(career.profile.playerName)), '</span><strong>ALTERAR FOTO</strong><input type="file" name="avatar" accept="image/*" data-profile-avatar /></label>',
      profileEditField("Nome de usuário", "username", career.user.username, "text", "@seuusuario"),
      profileEditField("Nova senha", "newPassword", "", "password", "Deixe vazio para manter a atual"),
      '<div class="profile-form-actions"><button type="button" data-profile-cancel>CANCELAR</button><button type="submit">SALVAR PERFIL <span>→</span></button></div></form>'
    ].join("");
  }

  function renderPlayerProfileForm(career) {
    var profile = career.profile;
    return [
      '<form class="profile-edit-form profile-edit-form--player" id="playerProfileForm"><header><div><span>EDIÇÃO</span><h2>FICHA DO JOGADOR</h2><p>Alterações salvas passam a integrar o contexto objetivo consultado pela IA.</p></div></header><div class="profile-edit-grid">',
      profileEditField("Nome completo", "playerName", profile.playerName, "text"),
      profileEditField("Nome na camisa", "shirtName", profile.shirtName, "text"),
      profileEditField("Data de nascimento", "birthDate", profile.birthDate, "date"),
      profileEditField("Nacionalidade principal", "primaryNationality", profile.primaryNationality || profile.nationality, "text"),
      profileEditField("Cidade de nascimento", "birthCity", profile.birthCity, "text"),
      profileEditField("Cidade atual", "currentCity", profile.currentCity, "text"),
      profileEditField("Clube atual", "currentClub", profile.currentClub, "text"),
      profileEditField("Liga", "league", profile.league, "text"),
      profileEditField("Temporada", "season", profile.season, "text"),
      profileEditField("Número atual", "shirtNumber", profile.shirtNumber, "text"),
      profileEditField("Posição principal", "position", profile.position, "text"),
      profileEditField("Posições secundárias", "secondaryPosition", profile.secondaryPosition, "text"),
      profileEditField("Pé dominante", "dominantFoot", profile.dominantFoot, "text"),
      profileEditField("Altura (cm)", "height", profile.height, "number"),
      profileEditField("Peso (kg)", "weight", profile.weight, "number"),
      profileEditField("Estilo de jogo", "playStyle", registrationValue(profile.playStyle), "text", "Separe por vírgulas"),
      profileEditTextarea("Pontos fortes técnicos", "technicalStrengths", registrationValue(profile.technicalStrengths)),
      profileEditTextarea("Pontos fortes mentais", "mentalStrengths", registrationValue(profile.mentalStrengths)),
      profileEditTextarea("Pontos fortes físicos", "physicalStrengths", registrationValue(profile.physicalStrengths)),
      profileEditTextarea("Fraquezas", "weaknesses", registrationValue(profile.weaknesses)),
      profileEditTextarea("Personalidade", "personality", profile.personality),
      profileEditTextarea("História", "backstory", profile.backstory),
      profileEditTextarea("Objetivos", "careerGoals", profile.careerGoals),
      '</div><div class="profile-form-actions"><button type="button" data-profile-cancel>CANCELAR</button><button type="submit">SALVAR FICHA <span>→</span></button></div></form>'
    ].join("");
  }

  function profileEditField(label, name, value, type, placeholder) {
    return '<label class="profile-edit-field"><span>' + escapeHTML(label) + '</span><input name="' + escapeHTML(name) + '" type="' + escapeHTML(type || "text") + '" value="' + escapeHTML(clean(value)) + '" placeholder="' + escapeHTML(placeholder || "") + '" /></label>';
  }

  function profileEditTextarea(label, name, value) {
    return '<label class="profile-edit-field profile-edit-field--wide"><span>' + escapeHTML(label) + '</span><textarea name="' + escapeHTML(name) + '" rows="3">' + escapeHTML(clean(value)) + "</textarea></label>";
  }

  function handleProfileClick(event) {
    var edit = event.target.closest("[data-profile-edit]");
    var cancel = event.target.closest("[data-profile-cancel]");
    if (edit) {
      ui.profileEdit = edit.dataset.profileEdit;
      ui.pendingAvatar = "";
      renderProfile();
    } else if (cancel) {
      ui.profileEdit = "";
      ui.pendingAvatar = "";
      renderProfile();
    }
  }

  async function handleProfileChange(event) {
    var input = event.target.closest("[data-profile-avatar]");
    if (!input) return;
    var file = input.files && input.files[0];
    if (!file) return;
    try {
      ui.pendingAvatar = await optimizeImage(file, 720, 720, 0.8);
      renderProfile();
      toast("Nova foto pronta para salvar.");
    } catch (error) {
      toast("Não foi possível processar essa imagem.", "error");
    }
  }

  async function saveProfileForm(event) {
    var form = event.target.closest("form");
    if (!form || (form.id !== "userProfileForm" && form.id !== "playerProfileForm")) return;
    event.preventDefault();
    var career = activeCareer();
    if (!career) return;
    var data = new FormData(form);
    if (form.id === "userProfileForm") {
      var username = normalizeUsername(data.get("username"));
      if (!/^@[a-z0-9._]{3,30}$/.test(username)) return void toast("Informe um nome de usuário válido começando com @.", "error");
      if (state.careers.some(function (item) { return item.id !== career.id && normalizeUsername(item.user && item.user.username) === username; })) return void toast("Este nome de usuário já está em uso neste navegador.", "error");
      var newPassword = String(data.get("newPassword") || "");
      if (newPassword && newPassword.length < 6) return void toast("A nova senha precisa ter pelo menos 6 caracteres.", "error");
      career.user.username = username;
      career.auth.username = username;
      if (newPassword) career.auth.passHash = await hashText(newPassword);
      if (ui.pendingAvatar) {
        career.user.avatarData = ui.pendingAvatar;
        career.profile.avatarData = ui.pendingAvatar;
      }
      career.updatedAt = new Date().toISOString();
      saveState();
      ui.profileEdit = "";
      ui.pendingAvatar = "";
      renderProfile();
      toast("Perfil do usuário atualizado.");
      return;
    }
    var arrayFields = ["technicalStrengths", "mentalStrengths", "physicalStrengths", "weaknesses"];
    var changed = [];
    Array.from(data.entries()).forEach(function (entry) {
      var key = entry[0];
      var incoming = arrayFields.indexOf(key) >= 0 ? splitCommaList(entry[1]) : clean(entry[1]);
      var previous = arrayFields.indexOf(key) >= 0 ? registrationValue(career.profile[key]) : clean(career.profile[key]);
      var comparable = arrayFields.indexOf(key) >= 0 ? registrationValue(incoming) : clean(incoming);
      if (previous !== comparable) {
        career.profile[key] = incoming;
        changed.push(key);
      }
    });
    if (!changed.length) {
      ui.profileEdit = "";
      renderProfile();
      toast("Nenhuma informação foi alterada.");
      return;
    }
    if (career.profile.primaryNationality) career.profile.nationality = [career.profile.primaryNationality, career.profile.secondNationality, career.profile.thirdNationality].filter(Boolean).join(", ");
    career.offPitch.currentCity = career.profile.currentCity || career.offPitch.currentCity;
    var updatedAt = new Date().toISOString();
    career.profileRevision = { updatedAt: updatedAt, changedFields: changed.slice() };
    career.profileChangeHistory.push({ id: uid("profile-change"), updatedAt: updatedAt, changedFields: changed.slice() });
    career.canonEvents.push({ id: uid("canon"), type: "profile_update", title: "Ficha objetiva do jogador atualizada", summary: "Campos alterados pelo usuário: " + changed.join(", ") + ".", occurredAt: updatedAt, certainty: "fact" });
    career.updatedAt = updatedAt;
    saveState();
    ui.profileEdit = "";
    renderAll();
    renderProfile();
    toast("Ficha salva e atualizada no contexto da IA.");
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
    el.spotifyClientId.value = ui.settingsDraft.spotifyClientId || "";
    el.spotifyRedirectUri.value = getSpotifyRedirectUri();
    updateBackendStatus();
    document.body.classList.add("is-modal-open");
    el.settingsModal.showModal();
  }

  function saveSettings() {
    if (!ui.settingsDraft) ui.settingsDraft = Object.assign({}, state.settings);
    ui.settingsDraft.spotifyClientId = clean(el.spotifyClientId.value);
    state.settings = Object.assign({}, state.settings, ui.settingsDraft);
    ui.settingsSaved = true;
    saveState();
    updateBackendStatus();
    el.settingsModal.close();
    toast("Configurações salvas.");
  }

  function updateBackendStatus() {
    var configured = Boolean(clean(state.settings.apiBaseUrl || PUBLIC_CONFIG.apiBaseUrl));
    var provider = clean(PUBLIC_CONFIG.aiProvider || "Cloudflare Workers AI");
    el.backendStatusText.textContent = configured ? provider + " · integrado pelo InyffX" : "Aguardando publicação do backend InyffX";
    el.backendStatusText.parentElement.classList.toggle("is-connected", configured);
    setAiStatus(configured ? "IA GRATUITA CONECTADA" : "IA AINDA NÃO PUBLICADA", configured);
  }

  function setAiStatus(label, connected) {
    el.aiStatusChip.querySelector("span").textContent = label;
    el.aiStatusChip.classList.toggle("is-connected", Boolean(connected));
  }

  function optimizeImage(file, maxWidth, maxHeight, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var image = new Image();
        image.onerror = reject;
        image.onload = function () {
          var widthLimit = Number(maxWidth || 1920);
          var heightLimit = Number(maxHeight || 1080);
          var ratio = Math.min(1, widthLimit / image.naturalWidth, heightLimit / image.naturalHeight);
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
          var context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/webp", Number(quality || 0.82)));
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

  function normalizeUsername(value) {
    var raw = clean(value);
    if (!raw) return "";
    raw = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    raw = raw.replace(/^@+/, "").replace(/\s+/g, "").replace(/[^a-z0-9._]/g, "").slice(0, 30);
    return "@" + raw;
  }

  function calculateAge(value) {
    var birth = new Date(String(value) + "T12:00:00");
    if (Number.isNaN(birth.getTime())) return 0;
    var today = new Date();
    var age = today.getFullYear() - birth.getFullYear();
    var beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    return Math.max(0, age - (beforeBirthday ? 1 : 0));
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
    populateLoginCareers();
    el.spotifyRedirectUri.value = getSpotifyRedirectUri();
    await handleSpotifyCallback();
    if (activeCareer()) startApp();
    else showAuth();
  }

  init();
})();
