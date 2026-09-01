(function () {
  "use strict";

  var STORAGE_KEY = "inyffx-interface-v2";
  var SESSION_KEY = "inyffx-active-career-v2";
  var PERSISTENT_SESSION_KEY = "inyffx-remembered-career-v1";
  var SPOTIFY_TOKEN_KEY = "inyffx-spotify-token-v1";
  var SPOTIFY_VERIFIER_KEY = "inyffx-spotify-verifier-v1";
  var SPOTIFY_STATE_KEY = "inyffx-spotify-state-v1";
  var ROUTES = ["home", "kick-off", "fyx-news", "relationships", "seasons", "player-career", "off-the-pitch"];
  var HUB_BACKGROUNDS = {
    "kick-off": "mod/pics/background/kick-off.jpg",
    "fyx-news": "mod/pics/background/fyx-news.jpeg",
    "relationships": "mod/pics/background/relationships.jpg",
    "seasons": "mod/pics/background/seasons.jpg",
    "player-career": "mod/pics/background/player-career.jpg",
    "off-the-pitch": "mod/pics/background/off-the-pitch.webp"
  };
  var DEFAULT_HUB_BACKGROUND = "kick-off";
  var REGISTRATION_QUESTIONS = Array.isArray(window.INYFFX_REGISTRATION_QUESTIONS) ? window.INYFFX_REGISTRATION_QUESTIONS : [];
  var REFERENCE_DATA = window.INYFFX_REFERENCE_DATA || {};
  var CHARACTER_SCHEMA = window.INYFFX_CHARACTER_SCHEMA || { categories: [], commonSections: [], categorySections: {}, quickKeys: [] };
  var TOOL_TITLES = { match: "Prompt de Partida", wheel: "Roleta", dice: "Dados" };
  var WHEEL_COLORS = ["#f4f4f4", "#262626", "#b8b8b8", "#454545", "#dedede", "#616161", "#a0a0a0", "#353535", "#c9c9c9", "#515151", "#ededed", "#747474"];
  var FYX_NEWS_IMAGES = [
    "mod/pics/fyxnews/manchete_1.jpg",
    "mod/pics/fyxnews/manchete_2.jpg",
    "mod/pics/fyxnews/manchete_3.jpg",
    "mod/pics/fyxnews/manchete_4.jpg",
    "mod/pics/fyxnews/manchete_5.jpg",
    "mod/pics/fyxnews/manchete_6.jpg"
  ];
  var PUBLIC_CONFIG = Object.assign({}, window.INYFFX_CONFIG || {}, window.INYFFX_TEST_CONFIG || {});
  var state = loadState();
  var ui = {
    authTab: "login",
    createStep: 0,
    registrationAnswers: {},
    registrationCustom: {},
    route: "home",
    newsFilter: "headline",
    relationshipCategory: "friends",
    editingCharacterId: "",
    characterMode: "quick",
    characterDraft: null,
    characterImageEdit: null,
    careerTab: "pay",
    dieSides: 20,
    lastDice: null,
    wheelResult: "",
    wheelRotation: 0,
    settingsDraft: null,
    settingsSaved: false,
    spotifyTimer: null,
    toolsMenuOpen: false,
    historyOpen: false,
    profileEdit: "",
    pendingAvatar: "",
    sending: false,
    hubBackgroundVisible: "A",
    hubBackgroundPreview: ""
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

  function normalizeWheelChoice(entry) {
    if (entry && typeof entry === "object") {
      return {
        label: clean(entry.label || entry.text || entry.value),
        weight: Math.min(999, Math.max(1, Math.round(Number(entry.weight) || 1)))
      };
    }
    return { label: clean(entry), weight: 1 };
  }

  function inferCharacterCategory(character) {
    var source = normalizeKey([character && character.category, character && character.role, character && character.relationship].filter(Boolean).join(" "));
    if (/namor|romance|esposa|marido|noiv|ficante|amor/.test(source)) return "romance";
    if (/time|elenco|companheir|jogador|goleiro|zagueiro|lateral|atacante|meio-campista/.test(source)) return "team";
    if (/profissional|empres|agente|tecnico|treinador|medico|fisioter|assessor|diretor|jornalista|advog|contador|preparador|psicolog|nutricionista|seguranca|motorista/.test(source)) return "professional";
    return "friends";
  }

  function normalizeCharacter(character) {
    var safe = character && typeof character === "object" ? character : {};
    var details = safe.details && typeof safe.details === "object" && !Array.isArray(safe.details) ? Object.assign({}, safe.details) : {};
    ["knownFacts", "unknownFacts", "immutableFacts", "currentState", "characterRules", "openInformation", "currentGoal", "speechStyle", "personalityTraits", "freeDescription"].forEach(function (key) {
      if (details[key] == null && safe[key] != null) details[key] = safe[key];
    });
    if (!Array.isArray(details.knownFacts)) details.knownFacts = Array.isArray(safe.knownFacts) ? safe.knownFacts.slice() : splitList(details.knownFacts);
    if (!Array.isArray(details.unknownFacts)) details.unknownFacts = splitList(details.unknownFacts);
    if (!Array.isArray(details.importantEvents)) details.importantEvents = [];
    safe.id = safe.id || uid("character");
    safe.name = clean(safe.name || details.fullName) || "Personagem sem nome";
    safe.category = ["friends", "romance", "professional", "team"].indexOf(safe.category) >= 0 ? safe.category : inferCharacterCategory(safe);
    safe.role = clean(safe.role) || characterCategoryMeta(safe.category).singular;
    safe.relationship = clean(safe.relationship) || "Não avaliada";
    safe.relationshipLevel = Number.isFinite(Number(safe.relationshipLevel)) ? Math.max(0, Math.min(100, Math.round(Number(safe.relationshipLevel)))) : null;
    safe.summary = clean(safe.summary || details.finalAISummary || details.freeDescription);
    safe.knownFacts = details.knownFacts.slice();
    safe.unknownFacts = details.unknownFacts.slice();
    safe.secretsKnown = Array.isArray(safe.secretsKnown) ? safe.secretsKnown : [];
    safe.avatarData = typeof safe.avatarData === "string" ? safe.avatarData : "";
    safe.bannerData = typeof safe.bannerData === "string" ? safe.bannerData : "";
    safe.details = details;
    safe.createdAt = safe.createdAt || safe.lastUpdated || new Date().toISOString();
    safe.lastUpdated = safe.lastUpdated || safe.createdAt;
    return safe;
  }

  function characterCategoryMeta(key) {
    return CHARACTER_SCHEMA.categories.find(function (category) { return category.key === key; }) || { key: "friends", label: "AMIGOS", singular: "Amigo(a)" };
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
    safe.chats = Array.isArray(safe.chats) ? safe.chats.filter(function (chat) {
      return chat && typeof chat === "object";
    }).map(function (chat, index) {
      var messages = Array.isArray(chat.messages) ? chat.messages : [];
      return {
        id: chat.id || uid("chat"),
        title: clean(chat.title) || "Dia " + (index + 1),
        scene: Number(chat.scene || index + 1),
        messages: messages,
        createdAt: chat.createdAt || (messages[0] && messages[0].createdAt) || new Date().toISOString(),
        updatedAt: chat.updatedAt || (messages[messages.length - 1] && messages[messages.length - 1].createdAt) || new Date().toISOString()
      };
    }) : [];
    if (!safe.chats.length && safe.messages.length) {
      safe.chats.push({
        id: uid("chat"),
        title: chatTitleFromContent((safe.messages.find(function (message) { return message.role === "user"; }) || {}).content, "Primeiro dia"),
        scene: Number((safe.messages[0] && safe.messages[0].scene) || safe.sceneNumber || 1),
        messages: safe.messages,
        createdAt: (safe.messages[0] && safe.messages[0].createdAt) || new Date().toISOString(),
        updatedAt: (safe.messages[safe.messages.length - 1] && safe.messages[safe.messages.length - 1].createdAt) || new Date().toISOString()
      });
    }
    safe.activeChatId = safe.chats.some(function (chat) { return chat.id === safe.activeChatId; })
      ? safe.activeChatId
      : (safe.chats.length ? safe.chats[safe.chats.length - 1].id : "");
    var normalizedActiveChat = safe.chats.find(function (chat) { return chat.id === safe.activeChatId; });
    safe.messages = normalizedActiveChat ? normalizedActiveChat.messages : [];
    safe.canonEvents = Array.isArray(safe.canonEvents) ? safe.canonEvents : [];
    safe.news = Array.isArray(safe.news) ? safe.news : [];
    safe.characters = Array.isArray(safe.characters) ? safe.characters.map(normalizeCharacter) : [];
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
    safe.tools = Object.assign({ wheelEntries: [{ label: "", weight: 1 }, { label: "", weight: 1 }], diceHistory: [] }, safe.tools || {});
    safe.tools.wheelEntries = Array.isArray(safe.tools.wheelEntries) && safe.tools.wheelEntries.length
      ? safe.tools.wheelEntries.slice(0, 12).map(normalizeWheelChoice)
      : [{ label: "", weight: 1 }, { label: "", weight: 1 }];
    while (safe.tools.wheelEntries.length < 2) safe.tools.wheelEntries.push({ label: "", weight: 1 });
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
      "nextStep", "createCareer", "hubSidebar", "openSettings", "openProfile",
      "hubBackgroundA", "hubBackgroundB", "pageBack", "appMain", "chatMessages", "chatForm", "chatInput", "sendMessage",
      "sceneLabel", "newScene", "aiStatusChip", "toolDrawer", "toolTitle", "closeTools", "matchTemplateForm",
      "chatHistoryControl", "toggleChatHistory", "chatHistoryPanel", "chatHistoryList", "kickToolsMenu", "toggleToolsMenu",
      "matchPromptTemplate", "copyMatchTemplate", "insertMatchTemplate", "wheel", "wheelResult", "wheelEntries", "addWheelEntry",
      "spinWheel", "dicePicker", "diceResult", "rollDice",
      "newsFilters", "newsContent", "relationshipSearch", "relationshipTabs", "relationshipsContent", "addCharacter",
      "characterEditor", "characterForm", "characterEditorTitle", "closeCharacterEditor", "deleteCharacter", "saveCharacter",
      "characterModeTabs", "characterFields", "characterAvatarInput", "characterBannerInput", "characterAvatarPreview",
      "characterBannerPreview", "characterPreviewName", "characterPreviewCategory",
      "characterImageEditor", "closeCharacterImageEditor",
      "characterCropStage", "characterCropCanvas", "characterCropZoom", "characterCropZoomValue", "resetCharacterCrop",
      "cancelCharacterCrop", "applyCharacterCrop",
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
    document.querySelectorAll("[data-hub-preview]").forEach(function (button) {
      button.addEventListener("mouseenter", function () { previewHubBackground(button.dataset.hubPreview); });
      button.addEventListener("focus", function () { previewHubBackground(button.dataset.hubPreview); });
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
    el.chatMessages.addEventListener("click", handleChatMessageClick);
    el.newScene.addEventListener("click", startNewScene);
    el.toggleToolsMenu.addEventListener("click", toggleToolsMenu);
    el.toggleChatHistory.addEventListener("click", toggleChatHistory);
    el.chatHistoryList.addEventListener("click", selectChatFromHistory);
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
    el.dicePicker.addEventListener("click", selectDie);
    el.rollDice.addEventListener("click", rollDice);
    el.newsFilters.addEventListener("click", changeNewsFilter);
    el.relationshipSearch.addEventListener("input", renderRelationships);
    el.relationshipTabs.addEventListener("click", changeRelationshipCategory);
    el.relationshipsContent.addEventListener("click", handleRelationshipCardClick);
    el.addCharacter.addEventListener("click", function () { openCharacterEditor(); });
    el.closeCharacterEditor.addEventListener("click", closeCharacterEditor);
    el.characterModeTabs.addEventListener("click", changeCharacterMode);
    el.characterFields.addEventListener("input", handleCharacterFieldInput);
    el.characterFields.addEventListener("change", handleCharacterFieldChange);
    el.characterFields.addEventListener("click", handleCharacterFieldClick);
    el.characterAvatarInput.addEventListener("change", handleCharacterImageChange);
    el.characterBannerInput.addEventListener("change", handleCharacterImageChange);
    el.closeCharacterImageEditor.addEventListener("click", closeCharacterImageEditor);
    el.cancelCharacterCrop.addEventListener("click", closeCharacterImageEditor);
    el.resetCharacterCrop.addEventListener("click", resetCharacterCrop);
    el.applyCharacterCrop.addEventListener("click", applyCharacterCrop);
    el.characterCropZoom.addEventListener("input", changeCharacterCropZoom);
    el.characterCropCanvas.addEventListener("pointerdown", beginCharacterCropDrag);
    el.characterCropCanvas.addEventListener("pointermove", moveCharacterCropDrag);
    el.characterCropCanvas.addEventListener("pointerup", endCharacterCropDrag);
    el.characterCropCanvas.addEventListener("pointercancel", endCharacterCropDrag);
    el.characterCropCanvas.addEventListener("keydown", nudgeCharacterCrop);
    el.characterImageEditor.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeCharacterImageEditor();
    });
    el.characterForm.addEventListener("submit", saveCharacterForm);
    el.deleteCharacter.addEventListener("click", deleteCurrentCharacter);
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
    var optionCount = question.type === "select" || question.type === "multi" ? registrationOptions(question).length : 0;
    el.registrationQuestion.className = [
      "registration-question",
      "registration-question--" + question.type,
      optionCount > 8 ? "is-dense" : "",
      optionCount > 24 ? "is-ultra-dense" : ""
    ].filter(Boolean).join(" ");
    el.registrationQuestion.style.setProperty("--option-count", String(optionCount));
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
    var matches = query.length >= minimum ? registrationOptions(question).filter(function (option) { return normalizeKey(option).indexOf(query) >= 0; }).slice(0, 8) : [];
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
        messages: [], chats: [], activeChatId: "", canonEvents: [], news: [], characters: [], seasons: [],
        finance: { initialized: false, currency: "BRL", balance: 0, transactions: [], pockets: [] },
        hall: { trophies: [], records: [], awards: [] }, calendar: [],
        offPitch: { currentCity: answers.currentCity || "", currentResidence: "", houses: [] },
        tools: { wheelEntries: [{ label: "", weight: 1 }, { label: "", weight: 1 }], diceHistory: [] }, sceneNumber: 1,
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
    setupHubBackgrounds();
    renderAll();
    routeFromHash();
    startSpotifyPolling();
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PERSISTENT_SESSION_KEY);
    closeProfile();
    closeTools();
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
    if (route !== "kick-off") {
      closeTools();
      closeToolsMenu();
      closeChatHistory();
    }
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

  function setupHubBackgrounds() {
    Object.keys(HUB_BACKGROUNDS).forEach(function (route) {
      var image = new Image();
      image.src = HUB_BACKGROUNDS[route];
    });
    var initialSource = HUB_BACKGROUNDS[DEFAULT_HUB_BACKGROUND];
    if (el.hubBackgroundA && initialSource) {
      el.hubBackgroundA.style.backgroundImage = 'url("' + initialSource + '")';
      el.hubBackgroundA.dataset.preview = DEFAULT_HUB_BACKGROUND;
      el.hubBackgroundA.classList.add("is-visible");
      if (el.hubBackgroundB) el.hubBackgroundB.classList.remove("is-visible");
      ui.hubBackgroundVisible = "A";
      ui.hubBackgroundPreview = DEFAULT_HUB_BACKGROUND;
    }
  }

  function previewHubBackground(route) {
    var source = HUB_BACKGROUNDS[route] || HUB_BACKGROUNDS[DEFAULT_HUB_BACKGROUND];
    var targetRoute = route in HUB_BACKGROUNDS ? route : DEFAULT_HUB_BACKGROUND;
    if (!el.hubBackgroundA || !el.hubBackgroundB || !source || ui.hubBackgroundPreview === targetRoute) return;
    var current = ui.hubBackgroundVisible === "A" ? el.hubBackgroundA : el.hubBackgroundB;
    var next = ui.hubBackgroundVisible === "A" ? el.hubBackgroundB : el.hubBackgroundA;
    next.style.backgroundImage = 'url("' + source + '")';
    next.dataset.preview = targetRoute;
    void next.offsetWidth;
    next.classList.add("is-visible");
    current.classList.remove("is-visible");
    ui.hubBackgroundVisible = ui.hubBackgroundVisible === "A" ? "B" : "A";
    ui.hubBackgroundPreview = targetRoute;
  }

  function renderAvatar(career) {
    var avatar = clean(career.user && career.user.avatarData) || clean(career.profile && career.profile.avatarData);
    var initials = playerInitials(career.profile && career.profile.playerName);
    if (el.profileAvatarImage) {
      el.profileAvatarImage.hidden = !avatar;
      if (avatar) el.profileAvatarImage.src = avatar;
      else el.profileAvatarImage.removeAttribute("src");
    }
    if (el.profileAvatarFallback) {
      el.profileAvatarFallback.hidden = Boolean(avatar);
      el.profileAvatarFallback.textContent = initials;
    }
    if (el.profileIdentityLine) el.profileIdentityLine.textContent = (career.user.username || "@jogador") + " · " + (career.profile.playerName || "Jogador");
  }

  function playerInitials(name) {
    var parts = clean(name).split(/\s+/).filter(Boolean);
    if (!parts.length) return "IX";
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "")).toLocaleUpperCase("pt-BR");
  }

  function chatTitleFromContent(content, fallback) {
    var title = clean(content).replace(/\s+/g, " ");
    if (!title) return fallback || "Novo dia";
    return title.length > 42 ? title.slice(0, 39).trimEnd() + "..." : title;
  }

  function getActiveChat(career, createIfMissing) {
    if (!career) return null;
    career.chats = Array.isArray(career.chats) ? career.chats : [];
    var chat = career.chats.find(function (item) { return item.id === career.activeChatId; }) || null;
    if (!chat && createIfMissing) chat = createCareerChat(career);
    career.messages = chat ? chat.messages : [];
    return chat;
  }

  function createCareerChat(career) {
    career.sceneNumber = career.chats.length ? Number(career.sceneNumber || 0) + 1 : Math.max(1, Number(career.sceneNumber || 1));
    var now = new Date().toISOString();
    var chat = {
      id: uid("chat"),
      title: "Novo dia",
      scene: career.sceneNumber,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
    career.chats.push(chat);
    career.activeChatId = chat.id;
    career.messages = chat.messages;
    return chat;
  }

  function activeMessages(career) {
    var chat = getActiveChat(career, false);
    return chat ? chat.messages : [];
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
    renderProfile();
    updateBackendStatus();
  }

  function renderChat() {
    var career = activeCareer();
    if (!career) return;
    renderChatHistory(career);
    var messages = activeMessages(career);
    if (!messages.length) {
      el.chatMessages.innerHTML = '<div class="kick-empty" id="chatEmpty"><span>Por onde começamos <strong>' + escapeHTML(career.profile.playerName || "jogador") + "</strong>?</span></div>";
      return;
    }
    el.chatMessages.innerHTML = messages.map(function (message) {
      var role = message.role === "assistant" ? "assistant" : "user";
      var isLongUserMessage = role === "user" && (clean(message.content).length > 420 || clean(message.content).split("\n").length > 7);
      return [
        '<article class="chat-message chat-message--', role, isLongUserMessage ? " is-collapsed" : "", '" data-message-id="', escapeHTML(message.id || ""), '">',
        '<div class="chat-message__body">', escapeHTML(message.content), '</div>',
        isLongUserMessage ? '<button class="chat-message__more" type="button" data-expand-message>Mostrar Mais <span>⌄</span></button>' : "",
        "</article>"
      ].join("");
    }).join("");
    requestAnimationFrame(function () { el.chatMessages.scrollTop = el.chatMessages.scrollHeight; });
  }

  function renderChatHistory(career) {
    if (!el.chatHistoryList) return;
    var chats = (career.chats || []).slice().reverse();
    el.chatHistoryControl.classList.toggle("has-chats", chats.length > 0);
    el.chatHistoryList.innerHTML = chats.map(function (chat) {
      var selected = chat.id === career.activeChatId;
      return '<button type="button" class="chat-history-item' + (selected ? " is-active" : "") + '" data-chat-id="' + escapeHTML(chat.id) + '"><span>' + escapeHTML(chat.title || "Novo dia") + '</span><small>' + escapeHTML(formatShortDate(chat.updatedAt || chat.createdAt)) + "</small></button>";
    }).join("");
  }

  function handleChatMessageClick(event) {
    var button = event.target.closest("[data-expand-message]");
    if (!button) return;
    var message = button.closest(".chat-message");
    if (!message) return;
    message.classList.remove("is-collapsed");
    button.remove();
  }

  async function sendChatMessage(event) {
    event.preventDefault();
    if (ui.sending) return;
    var career = activeCareer();
    var content = clean(el.chatInput.value);
    if (!career || !content) return;
    var chat = getActiveChat(career, true);
    var userMessage = {
      id: uid("message"),
      role: "user",
      content: content,
      scene: chat.scene,
      createdAt: new Date().toISOString()
    };
    chat.messages.push(userMessage);
    if (chat.messages.filter(function (message) { return message.role === "user"; }).length === 1) chat.title = chatTitleFromContent(content, "Novo dia");
    chat.updatedAt = userMessage.createdAt;
    career.messages = chat.messages;
    career.updatedAt = userMessage.createdAt;
    var matchAdded = registerMatchFromMessage(career, userMessage);
    saveState();
    el.chatInput.value = "";
    autosizeComposer();
    renderAll();
    if (matchAdded) {
      var importedSuffix = Number(userMessage.teamImportedCount) > 0 ? " " + plural(userMessage.teamImportedCount, "integrante do elenco foi atualizado", "integrantes do elenco foram atualizados") + " em TIME." : "";
      toast("Partida registrada em SEASONS e repercussão factual criada em FYX NEWS." + importedSuffix);
    }
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
          schemaVersion: "1.1",
          turnId: userMessage.id,
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
        chat.messages.push({
          id: (payload.message && payload.message.id) || uid("message"),
          role: "assistant",
          content: reply,
          scene: chat.scene,
          createdAt: (payload.message && payload.message.createdAt) || new Date().toISOString()
        });
      }
      chat.updatedAt = new Date().toISOString();
      career.messages = chat.messages;
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
    article.innerHTML = '<div class="chat-message__body">Construindo a próxima parte da cena</div>';
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
      recentMessages: activeMessages(career).slice(-12).map(function (message) {
        return { role: message.role, content: message.content, createdAt: message.createdAt };
      }),
      memory: {
        canonEvents: career.canonEvents.slice(-18),
        characters: career.characters.slice(-24).map(characterContextRecord),
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

  function characterContextRecord(character) {
    var normalized = normalizeCharacter(character);
    return {
      id: normalized.id,
      name: normalized.name,
      category: normalized.category,
      role: normalized.role,
      relationship: normalized.relationship,
      relationshipLevel: normalized.relationshipLevel,
      summary: normalized.summary,
      knownFacts: normalized.knownFacts,
      unknownFacts: normalized.unknownFacts,
      secretsKnown: normalized.secretsKnown,
      details: normalized.details,
      lastUpdated: normalized.lastUpdated
    };
  }

  function applyMemoryUpdates(career, updates) {
    if (!updates || typeof updates !== "object") return;
    upsertMany(career.news, updates.news);
    upsertCharacters(career.characters, updates.characters);
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

  function upsertCharacters(target, incoming) {
    if (!Array.isArray(target) || !Array.isArray(incoming)) return;
    incoming.forEach(function (item) {
      if (!item || typeof item !== "object" || !clean(item.name)) return;
      var itemName = normalizeKey(item.name);
      var index = target.findIndex(function (existing) {
        return existing.id === item.id || normalizeKey(existing.name) === itemName;
      });
      if (index < 0) {
        target.push(normalizeCharacter(item));
        return;
      }
      var existing = normalizeCharacter(target[index]);
      var merged = Object.assign({}, existing, item, { id: existing.id });
      merged.details = Object.assign({}, existing.details, item.details || {});
      ["knownFacts", "unknownFacts", "immutableFacts", "currentState", "characterRules", "openInformation", "currentGoal", "speechStyle", "personalityTraits", "freeDescription"].forEach(function (key) {
        if (item[key] != null) merged.details[key] = item[key];
      });
      target[index] = normalizeCharacter(merged);
    });
  }

  function startNewScene() {
    var career = activeCareer();
    if (!career) return;
    var current = getActiveChat(career, false);
    if (!current || current.messages.length) createCareerChat(career);
    career.updatedAt = new Date().toISOString();
    el.sceneLabel.textContent = "Novo dia";
    saveState();
    closeChatHistory();
    closeToolsMenu();
    renderChat();
    toast("Novo dia iniciado. As conversas e o cânone anteriores foram preservados.");
    el.chatInput.focus();
  }

  function toggleChatHistory() {
    ui.historyOpen = !ui.historyOpen;
    el.chatHistoryControl.classList.toggle("is-open", ui.historyOpen);
    el.toggleChatHistory.setAttribute("aria-expanded", String(ui.historyOpen));
  }

  function closeChatHistory() {
    ui.historyOpen = false;
    if (el.chatHistoryControl) el.chatHistoryControl.classList.remove("is-open");
    if (el.toggleChatHistory) el.toggleChatHistory.setAttribute("aria-expanded", "false");
  }

  function selectChatFromHistory(event) {
    var button = event.target.closest("[data-chat-id]");
    var career = activeCareer();
    if (!button || !career) return;
    var chat = career.chats.find(function (item) { return item.id === button.dataset.chatId; });
    if (!chat) return;
    career.activeChatId = chat.id;
    career.sceneNumber = Number(chat.scene || career.sceneNumber || 1);
    career.messages = chat.messages;
    saveState();
    closeChatHistory();
    renderChat();
    el.chatInput.focus();
  }

  function autosizeComposer() {
    el.chatInput.style.height = "auto";
    var computed = window.getComputedStyle(el.chatInput);
    var lineHeight = parseFloat(computed.lineHeight) || 24;
    var padding = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
    var contentHeight = Math.max(lineHeight, el.chatInput.scrollHeight - padding);
    var lines = Math.max(1, Math.round(contentHeight / lineHeight));
    var targetHeight = Math.min(el.chatInput.scrollHeight, 190);
    var radius = lines <= 1 ? 999 : Math.max(16, 34 - (lines - 2) * 4);
    el.chatInput.style.height = targetHeight + "px";
    el.chatForm.style.setProperty("--composer-radius", radius + "px");
    el.chatForm.classList.toggle("is-multiline", lines > 1);
    el.chatMessages.style.setProperty("--composer-clearance", Math.max(260, targetHeight + 220) + "px");
  }

  function openTool(tool) {
    closeToolsMenu();
    selectTool(tool);
    el.toolDrawer.classList.add("is-open");
    el.toolDrawer.setAttribute("aria-hidden", "false");
    el.toolDrawer.scrollTop = 0;
    document.querySelector(".kick-layout").classList.add("has-tools");
  }

  function closeTools() {
    el.toolDrawer.classList.remove("is-open");
    el.toolDrawer.setAttribute("aria-hidden", "true");
    var layout = document.querySelector(".kick-layout");
    if (layout) layout.classList.remove("has-tools");
  }

  function toggleToolsMenu() {
    ui.toolsMenuOpen = !ui.toolsMenuOpen;
    el.kickToolsMenu.classList.toggle("is-open", ui.toolsMenuOpen);
    el.kickToolsMenu.setAttribute("aria-hidden", String(!ui.toolsMenuOpen));
    el.toggleToolsMenu.setAttribute("aria-expanded", String(ui.toolsMenuOpen));
  }

  function closeToolsMenu() {
    ui.toolsMenuOpen = false;
    if (el.kickToolsMenu) {
      el.kickToolsMenu.classList.remove("is-open");
      el.kickToolsMenu.setAttribute("aria-hidden", "true");
    }
    if (el.toggleToolsMenu) el.toggleToolsMenu.setAttribute("aria-expanded", "false");
  }

  function selectTool(tool) {
    var target = TOOL_TITLES[tool] ? tool : "match";
    el.toolTitle.textContent = TOOL_TITLES[target];
    document.querySelectorAll("[data-tool-tab]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.toolTab === target); });
    document.querySelectorAll("[data-tool-panel]").forEach(function (panel) {
      var isActive = panel.dataset.toolPanel === target;
      panel.classList.toggle("is-active", isActive);
      if (isActive) panel.scrollTop = 0;
    });
    if (target === "wheel") renderWheelEntries();
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
    message.teamImportedCount = importTeamFromLineup(career, fields, message.content, homeTeam, awayTeam);
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

  function importTeamFromLineup(career, fields, rawMessage, homeTeam, awayTeam) {
    var formationKeys = Object.keys(fields || {}).filter(function (key) { return /formacao|escalacao|elenco/.test(normalizeKey(key)); });
    var source = formationKeys.map(function (key) { return fields[key]; }).join("\n");
    if (!source) source = String(rawMessage || "");
    else source = "Formação: " + source;
    var lineup = typeof CHARACTER_SCHEMA.parseLineup === "function" ? CHARACTER_SCHEMA.parseLineup(source) : [];
    var protagonist = normalizeKey(career.profile.playerName || "");
    var currentClub = clean(career.profile.currentClub || "");
    var club = currentClub || clean(homeTeam || awayTeam || "");
    var imported = 0;
    lineup.forEach(function (lineupPlayer) {
      var abbreviation = lineupPlayer.abbreviation;
      var name = clean(lineupPlayer.name);
      var normalizedName = normalizeKey(name);
      if (!normalizedName || normalizedName === protagonist) return;
      var existing = career.characters.find(function (character) { return normalizeKey(character.name) === normalizedName; });
      var now = new Date().toISOString();
      if (!existing) {
        var details = {
          teamClub: club,
          position: lineupPlayer.position || abbreviation,
          immutableFacts: [name + " integra o elenco de " + (club || "seu clube") + "."],
          currentState: ["Companheiro de equipe atual do protagonista."],
          knownFacts: [],
          unknownFacts: [],
          importantEvents: [],
          finalAISummary: name + " é " + (lineupPlayer.position || "jogador") + " do elenco de " + (club || "seu clube") + ". A relação ainda será desenvolvida no roleplay."
        };
        career.characters.push(normalizeCharacter({
          id: uid("character"),
          name: name,
          category: "team",
          role: "Companheiro de time · " + (lineupPlayer.position || abbreviation),
          relationship: "Não avaliada",
          relationshipLevel: null,
          summary: details.finalAISummary,
          details: details,
          source: "match-lineup",
          createdAt: now,
          lastUpdated: now
        }));
      } else {
        existing = normalizeCharacter(existing);
        existing.category = "team";
        existing.details.teamClub = club || existing.details.teamClub || "";
        existing.details.position = lineupPlayer.position || existing.details.position || abbreviation;
        existing.role = clean(existing.details.squadRole) || "Companheiro de time · " + existing.details.position;
        existing.lastUpdated = now;
        var existingIndex = career.characters.findIndex(function (character) { return character.id === existing.id; });
        if (existingIndex >= 0) career.characters[existingIndex] = existing;
      }
      imported += 1;
    });
    return imported;
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
    if (ui.newsFilter === "social" || ui.newsFilter === "gossip") {
      renderNewsSocialBoard(career, ui.newsFilter);
      return;
    }
    renderNewsFrontPage(career);
  }

  function newsTime(item) {
    var value = new Date(item && (item.occurredAt || item.createdAt) || 0).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  function orderedNews(career, types) {
    var accepted = Array.isArray(types) ? types : [types];
    return career.news.filter(function (item) { return accepted.indexOf(item.type) >= 0; }).slice().sort(function (a, b) {
      return newsTime(b) - newsTime(a);
    });
  }

  function stableNewsNumber(value) {
    var source = String(value || "");
    var result = 2166136261;
    for (var index = 0; index < source.length; index += 1) {
      result ^= source.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function newsImage(item) {
    if (item && item.image && /^mod\/pics\/fyxnews\/manchete_[1-6]\.jpg$/i.test(item.image)) return item.image;
    return FYX_NEWS_IMAGES[stableNewsNumber(item && (item.id || item.title)) % FYX_NEWS_IMAGES.length];
  }

  function firstSentence(value) {
    var source = clean(value);
    if (!source) return "";
    var match = source.match(/^(.+?[.!?])(?:\s|$)/);
    return clean(match ? match[1] : source).slice(0, 260);
  }

  function relatedNews(career, lead) {
    var sourceId = clean(lead && lead.sourceMessageId);
    var items = career.news.filter(function (item) {
      if (!lead || item.id === lead.id) return false;
      return sourceId ? clean(item.sourceMessageId) === sourceId : Math.abs(newsTime(item) - newsTime(lead)) < 180000;
    });
    return items.sort(function (a, b) { return newsTime(b) - newsTime(a); });
  }

  function renderNewsFrontPage(career) {
    var headlines = orderedNews(career, "headline");
    var lead = headlines[0] || orderedNews(career, ["analysis", "comment", "social"])[0];
    if (!lead) {
      el.newsContent.innerHTML = '<section class="fyx-news-empty"><strong>NENHUMA MANCHETE PUBLICADA</strong><p>Quando um acontecimento público for registrado no KICK OFF, a primeira página será montada aqui.</p></section>';
      return;
    }

    var related = relatedNews(career, lead);
    var analysis = related.find(function (item) { return item.type === "analysis"; }) || orderedNews(career, "analysis")[0];
    var supporting = analysis || related.find(function (item) { return item.type === "comment"; }) || lead;
    var protagonist = clean(career.profile && career.profile.playerName) || "Jogador em destaque";
    var secondaryTitle = clean(lead.secondaryTitle || supporting.secondaryTitle || supporting.title) || "A partida em detalhes";
    var story = clean(supporting.summary || lead.summary) || "A cobertura será ampliada conforme os acontecimentos públicos forem registrados no KICK OFF.";
    var caption = clean(lead.imageCaption || supporting.imageCaption) || firstSentence(story) || lead.title;
    var kicker = clean(lead.kicker) || [formatDate(lead.occurredAt || lead.createdAt), lead.title, protagonist].filter(Boolean).join(" · ");

    el.newsContent.innerHTML = [
      '<section class="fyx-paper">',
      '<header class="fyx-paper__masthead"><div class="fyx-paper__brand">FYX NEWS</div><div class="fyx-paper__lead"><h2>', escapeHTML(lead.title || "FYX NEWS"), "</h2></div></header>",
      '<div class="fyx-paper__kicker">', escapeHTML(kicker), "</div>",
      '<div class="fyx-paper__story"><article class="fyx-paper__copy"><i aria-hidden="true"></i><h3>', escapeHTML(secondaryTitle), "</h3><p>", escapeHTML(story), "</p></article>",
      '<figure class="fyx-paper__visual"><img src="', escapeHTML(newsImage(lead)), '" alt="Imagem da cobertura de ', escapeHTML(lead.title || "partida"), '" /><figcaption>', escapeHTML(caption), "</figcaption></figure></div>",
      "</section>"
    ].join("");
  }

  function newsHandle(item, index, type) {
    var explicit = clean(item && item.handle);
    if (explicit) return explicit.charAt(0) === "@" ? explicit : "@" + explicit;
    var source = normalizeKey(item && item.source || (type === "gossip" ? "fyx bastidores" : "fyx torcida")).replace(/[^a-z0-9]/g, "");
    return "@" + (source || "fyxnews") + (index ? String(index + 1) : "");
  }

  function newsPostCount(item) {
    var explicit = clean(item && item.postCount);
    if (explicit) return explicit;
    var number = stableNewsNumber(item && (item.id || item.title));
    return (2 + number % 78) + "," + (number % 10) + "k posts";
  }

  function socialPostMarkup(item, index, type) {
    if (!item) {
      return '<article class="fyx-social-post is-empty"><strong>SEM NOVA PUBLICAÇÃO</strong><p>Novos comentários aparecerão quando forem criados a partir do KICK OFF.</p></article>';
    }
    return [
      '<article class="fyx-social-post"><strong>', escapeHTML(newsHandle(item, index, type)), "</strong>",
      "<p>", escapeHTML(item.summary || item.title || "Nova repercussão registrada."), "</p></article>"
    ].join("");
  }

  function trendMarkup(item, index, type) {
    if (!item) return "";
    var category = type === "social" ? "Sports · Trending" : "Trending";
    return [
      '<article class="fyx-trend"><span>', index + 1, " · ", category, "</span><strong>",
      escapeHTML(item.trend || item.title || item.subject || "Assunto em destaque"), "</strong></article>"
    ].join("");
  }

  function renderNewsSocialBoard(career, type) {
    var direct = orderedNews(career, type);
    var supporting = type === "social" ? orderedNews(career, ["fanclub", "comment"]) : [];
    var posts = direct.concat(supporting.filter(function (item) {
      return !direct.some(function (existing) { return existing.id === item.id; });
    })).slice(0, 4);
    var headlineSource = direct.length ? direct : type === "social" ? orderedNews(career, "headline") : [];
    var headlines = headlineSource.slice(0, 3);
    var trends = direct.concat(type === "social" ? orderedNews(career, "headline") : []).filter(function (item, index, items) {
      return items.findIndex(function (candidate) { return candidate.id === item.id; }) === index;
    }).slice(0, 4);
    var hasPosts = posts.length > 0;

    while (posts.length < 4) posts.push(null);

    el.newsContent.innerHTML = [
      '<section class="fyx-social-board fyx-social-board--', type, '">',
      '<div class="fyx-social-phone"><img src="mod/pics/fyxnews/sociais/iphone.png" alt="iPhone exibindo a identidade do FYX" /></div>',
      '<div class="fyx-social-feed', hasPosts ? "" : " is-empty", '">',
      hasPosts ? posts.map(function (item, index) { return socialPostMarkup(item, index, type); }).join("") : '<div class="fyx-social-feed-empty"><strong>NENHUMA PUBLICAÇÃO</strong><p>O conteúdo será criado a partir dos acontecimentos e pedidos feitos no KICK OFF.</p></div>',
      "</div>",
      '<aside class="fyx-social-side"><section class="fyx-today"><h2>Today’s News</h2>',
      headlines.length ? headlines.map(function (item) {
        return '<article><strong>' + escapeHTML(item.title || "Assunto em destaque") + '</strong><span>' + escapeHTML(newsPostCount(item)) + "</span></article>";
      }).join("") : '<p class="fyx-social-empty-copy">Nenhuma repercussão pública registrada.</p>',
      '</section><section class="fyx-trending">',
      trends.length ? trends.map(function (item, index) { return trendMarkup(item, index, type); }).join("") : '<p class="fyx-social-empty-copy">Nenhum assunto em alta.</p>',
      "</section></aside></section>"
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
    var category = ui.relationshipCategory || "friends";
    el.relationshipTabs.querySelectorAll("[data-relationship-category]").forEach(function (button) {
      var active = button.dataset.relationshipCategory === category;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    var characters = career.characters.map(normalizeCharacter).filter(function (character) {
      if (character.category !== category) return false;
      var haystack = normalizeKey([character.name, character.role, character.relationship, character.summary, JSON.stringify(character.details || {})].join(" "));
      return !query || haystack.indexOf(query) >= 0;
    }).sort(function (a, b) { return a.name.localeCompare(b.name, "pt-BR"); });
    if (!characters.length) {
      var categoryMeta = characterCategoryMeta(category);
      el.relationshipsContent.innerHTML = [
        '<div class="relationships-empty"><div><span>', escapeHTML(categoryMeta.label), '</span><h2>', query ? "Nenhum personagem encontrado." : "Nenhum personagem nesta categoria.", '</h2><p>',
        query ? "Tente outro nome ou limpe a busca." : (category === "team" ? "Preencha os nomes do elenco no modelo de partida do KICK OFF ou cadastre alguém manualmente." : "Crie uma ficha agora ou deixe a IA registrar esta pessoa gradualmente durante o roleplay."),
        '</p><button class="relationship-add" type="button" data-empty-add-character><span aria-hidden="true">+</span> NOVO PERSONAGEM</button></div></div>'
      ].join("");
      return;
    }
    el.relationshipsContent.innerHTML = '<div class="relationship-grid">' + characters.map(function (character) {
      var initials = characterInitials(character.name);
      var details = character.details || {};
      var relationshipLabel = character.relationship || relationshipScaleLabel(details.relationshipCurrent);
      var level = Number.isFinite(Number(details.relationshipCurrent)) ? Math.round(Number(details.relationshipCurrent)) + "/7" : "EM CONSTRUÇÃO";
      var summary = character.summary || "A ficha será aprofundada conforme este personagem viver cenas no KICK OFF.";
      return [
        '<button class="relationship-card" type="button" data-edit-character="', escapeHTML(character.id), '" aria-label="Editar ficha de ', escapeHTML(character.name), '">',
        '<div class="relationship-card__banner">', character.bannerData ? '<img src="' + escapeHTML(character.bannerData) + '" alt="" />' : "", '</div>',
        '<div class="relationship-card__body"><span class="relationship-avatar">', character.avatarData ? '<img src="' + escapeHTML(character.avatarData) + '" alt="" />' : escapeHTML(initials || "?"), '</span>',
        '<div class="relationship-card__meta"><h2>', escapeHTML(character.name || "Sem nome"), '</h2><span>', escapeHTML(level), '</span></div>',
        '<span class="relationship-card__role">', escapeHTML(character.role || characterCategoryMeta(character.category).singular), ' · ', escapeHTML(relationshipLabel), '</span>',
        '<p>', escapeHTML(summary), '</p><span class="relationship-card__edit">EDITAR FICHA →</span></div></button>'
      ].join("");
    }).join("") + "</div>";
  }

  function changeRelationshipCategory(event) {
    var button = event.target.closest("[data-relationship-category]");
    if (!button) return;
    ui.relationshipCategory = button.dataset.relationshipCategory;
    renderRelationships();
  }

  function handleRelationshipCardClick(event) {
    var emptyButton = event.target.closest("[data-empty-add-character]");
    if (emptyButton) return openCharacterEditor();
    var card = event.target.closest("[data-edit-character]");
    if (card) openCharacterEditor(card.dataset.editCharacter);
  }

  function characterInitials(name) {
    return clean(name).split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join("").toUpperCase();
  }

  function blankCharacter(category) {
    var character = normalizeCharacter({
      id: uid("character"),
      name: "",
      category: category || ui.relationshipCategory || "friends",
      details: {
        approximateAge: "",
        relationshipCurrent: 4,
        personalityTraits: [],
        speechStyle: [],
        knownFacts: [],
        unknownFacts: [],
        importantEvents: []
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
    character.name = "";
    return character;
  }

  function openCharacterEditor(characterId) {
    var career = activeCareer();
    if (!career) return;
    var existing = characterId ? career.characters.find(function (character) { return character.id === characterId; }) : null;
    ui.editingCharacterId = existing ? existing.id : "";
    ui.characterMode = existing ? "complete" : "quick";
    ui.characterDraft = existing ? JSON.parse(JSON.stringify(normalizeCharacter(existing))) : blankCharacter(ui.relationshipCategory);
    el.characterEditor.hidden = false;
    document.body.classList.add("is-character-editor-open");
    renderCharacterEditor();
    el.characterEditor.scrollTop = 0;
    window.setTimeout(function () {
      var nameInput = el.characterFields.querySelector('[data-character-core="name"]');
      if (nameInput) nameInput.focus();
    }, 70);
  }

  function closeCharacterEditor() {
    el.characterEditor.hidden = true;
    document.body.classList.remove("is-character-editor-open");
    ui.editingCharacterId = "";
    ui.characterDraft = null;
  }

  function changeCharacterMode(event) {
    var button = event.target.closest("[data-character-mode]");
    if (!button || !ui.characterDraft) return;
    captureCharacterDraft();
    ui.characterMode = button.dataset.characterMode === "complete" ? "complete" : "quick";
    renderCharacterEditor();
  }

  function renderCharacterEditor() {
    var draft = ui.characterDraft;
    if (!draft) return;
    var meta = characterCategoryMeta(draft.category);
    el.characterEditorTitle.textContent = ui.editingCharacterId ? clean(draft.name || "EDITAR PERSONAGEM").toUpperCase() : "NOVO PERSONAGEM";
    el.deleteCharacter.hidden = !ui.editingCharacterId;
    el.characterModeTabs.querySelectorAll("[data-character-mode]").forEach(function (button) {
      var active = button.dataset.characterMode === ui.characterMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    var sections = CHARACTER_SCHEMA.commonSections.slice();
    if (ui.characterMode === "complete") {
      var specific = CHARACTER_SCHEMA.categorySections[draft.category] || [];
      var insertion = sections.findIndex(function (section) { return section.id === "appearance"; });
      sections.splice.apply(sections, [insertion < 0 ? sections.length : insertion, 0].concat(specific));
    }
    if (ui.characterMode === "quick") {
      sections = sections.map(function (section) {
        return Object.assign({}, section, { fields: section.fields.filter(function (field) { return field.quick; }) });
      }).filter(function (section) { return section.fields.length; });
    }
    el.characterFields.innerHTML = renderCharacterIdentity(draft) + sections.map(function (section, index) {
      return renderCharacterFormSection(section, draft, ui.characterMode === "quick" || index === 0);
    }).join("");
    updateCharacterMediaPreview();
    el.characterPreviewCategory.textContent = meta.label;
  }

  function renderCharacterIdentity(draft) {
    return [
      '<details class="character-form-section" open><summary><div><strong>Identidade</strong><small>A relação define em qual categoria a ficha aparece.</small></div></summary>',
      '<div class="character-section-fields">',
      '<label class="character-field"><span>Qual é a relação deste personagem com o seu jogador? <em>*</em></span><select data-character-core="category">',
      CHARACTER_SCHEMA.categories.map(function (category) { return '<option value="' + escapeHTML(category.key) + '"' + (category.key === draft.category ? " selected" : "") + '>' + escapeHTML(category.label) + "</option>"; }).join(""),
      '</select></label>',
      '<label class="character-field"><span>Qual é o nome completo do personagem? <em>*</em></span><input data-character-core="name" type="text" maxlength="160" value="', escapeHTML(draft.name === "Personagem sem nome" ? "" : draft.name), '" autocomplete="off" /></label>',
      '</div></details>'
    ].join("");
  }

  function renderCharacterFormSection(section, draft, open) {
    var visible = section.fields.filter(function (field) { return characterFieldVisible(field, draft.details); });
    if (!visible.length) return "";
    return [
      '<details class="character-form-section"', open ? " open" : "", '><summary><div><strong>', escapeHTML(section.title), '</strong><small>', escapeHTML(section.description || ""), '</small></div></summary><div class="character-section-fields">',
      visible.map(function (field) { return renderCharacterField(field, draft); }).join(""),
      '</div></details>'
    ].join("");
  }

  function characterFieldVisible(field, details) {
    if (!field.when) return true;
    var value = details[field.when.key];
    if (Object.prototype.hasOwnProperty.call(field.when, "equals")) return value === field.when.equals;
    if (Array.isArray(field.when.oneOf)) return field.when.oneOf.indexOf(value) >= 0;
    return true;
  }

  function characterFieldOptions(field) {
    if (field.source && Array.isArray(REFERENCE_DATA[field.source])) return REFERENCE_DATA[field.source];
    return Array.isArray(field.options) ? field.options : [];
  }

  function renderCharacterField(field, draft) {
    var details = draft.details || {};
    var value = details[field.key];
    var required = field.required ? " <em>*</em>" : "";
    var wide = field.type === "textarea" || field.type === "tags" || field.type === "multi" || field.type === "events" || field.type === "summary" || field.large;
    var className = "character-field character-field--" + field.type + (wide ? " is-wide" : "");
    var help = field.help ? '<small>' + escapeHTML(field.help) + "</small>" : "";
    var placeholder = field.placeholder ? ' placeholder="' + escapeHTML(field.placeholder) + '"' : "";
    if (field.type === "checkbox") {
      return '<label class="character-field is-wide"><span class="character-check"><input type="checkbox" data-character-field="' + escapeHTML(field.key) + '"' + (value ? " checked" : "") + ' />' + escapeHTML(field.label) + "</span>" + help + "</label>";
    }
    if (field.type === "textarea" || field.type === "tags") {
      var textValue = Array.isArray(value) ? value.join("\n") : clean(value || "");
      return '<label class="' + className + '"><span>' + escapeHTML(field.label) + required + '</span><textarea class="' + (field.large ? "is-large" : "") + '" data-character-field="' + escapeHTML(field.key) + '"' + placeholder + '>' + escapeHTML(textValue) + "</textarea>" + help + "</label>";
    }
    if (field.type === "select") {
      return '<label class="' + className + '"><span>' + escapeHTML(field.label) + required + '</span><select data-character-field="' + escapeHTML(field.key) + '"><option value="">Selecione</option>' + characterFieldOptions(field).map(function (option) { return '<option value="' + escapeHTML(option) + '"' + (option === value ? " selected" : "") + '>' + escapeHTML(option) + "</option>"; }).join("") + "</select>" + help + "</label>";
    }
    if (field.type === "combo") {
      var listId = "character-options-" + field.key;
      return '<label class="' + className + '"><span>' + escapeHTML(field.label) + required + '</span><input type="text" list="' + escapeHTML(listId) + '" data-character-field="' + escapeHTML(field.key) + '" value="' + escapeHTML(value || "") + '"' + placeholder + ' /><datalist id="' + escapeHTML(listId) + '">' + characterFieldOptions(field).map(function (option) { return '<option value="' + escapeHTML(option) + '"></option>'; }).join("") + "</datalist>" + help + "</label>";
    }
    if (field.type === "multi") {
      var selected = Array.isArray(value) ? value : splitList(value);
      var options = characterFieldOptions(field);
      var custom = selected.filter(function (item) { return options.indexOf(item) < 0; });
      return '<fieldset class="' + className + '"><legend>' + escapeHTML(field.label) + required + '</legend><div class="character-multi-options">' + options.map(function (option) { return '<label><input type="checkbox" data-character-field="' + escapeHTML(field.key) + '" value="' + escapeHTML(option) + '"' + (selected.indexOf(option) >= 0 ? " checked" : "") + ' />' + escapeHTML(option) + "</label>"; }).join("") + '</div>' + (field.custom ? '<input class="character-multi-custom" type="text" data-character-multi-custom="' + escapeHTML(field.key) + '" value="' + escapeHTML(custom.join(", ")) + '" placeholder="Outra característica ou opção" />' : "") + (field.max ? '<small>Escolha até ' + Number(field.max) + " opções.</small>" : "") + help + "</fieldset>";
    }
    if (field.type === "range") {
      var rangeValue = Number.isFinite(Number(value)) ? Number(value) : Number(field.min || 0);
      return '<label class="' + className + '"><span>' + escapeHTML(field.label) + required + '</span><div class="character-range-row"><input type="range" data-character-field="' + escapeHTML(field.key) + '" min="' + Number(field.min || 0) + '" max="' + Number(field.max || 100) + '" value="' + rangeValue + '" /><output data-character-range-output="' + escapeHTML(field.key) + '">' + escapeHTML(characterRangeLabel(field, rangeValue)) + "</output></div>" + help + "</label>";
    }
    if (field.type === "events") return renderCharacterEvents(field, value);
    if (field.type === "summary") return '<div class="' + className + '"><span>' + escapeHTML(field.label) + '</span><div class="character-summary-box">' + escapeHTML(buildCharacterSummary(draft)) + "</div></div>";
    var inputType = field.type === "date" || field.type === "number" ? field.type : "text";
    var min = field.min != null ? ' min="' + Number(field.min) + '"' : "";
    var max = field.max != null ? ' max="' + Number(field.max) + '"' : "";
    return '<label class="' + className + '"><span>' + escapeHTML(field.label) + required + '</span><input type="' + inputType + '" data-character-field="' + escapeHTML(field.key) + '" value="' + escapeHTML(value == null ? "" : value) + '"' + min + max + placeholder + ' />' + help + "</label>";
  }

  function renderCharacterEvents(field, value) {
    var events = Array.isArray(value) ? value : [];
    return '<div class="character-field character-field--events is-wide"><span>' + escapeHTML(field.label) + '</span><div class="character-events">' + events.map(function (item, index) {
      return '<div class="character-event-row" data-character-event-row="' + index + '"><input type="text" data-character-event-key="title" value="' + escapeHTML(item.title || "") + '" placeholder="Título do acontecimento" /><input type="text" data-character-event-key="date" value="' + escapeHTML(item.date || "") + '" placeholder="Data aproximada" /><select data-character-event-key="importance"><option value="">Importância</option>' + ["Baixa", "Média", "Alta", "Decisiva"].map(function (option) { return '<option value="' + option + '"' + (item.importance === option ? " selected" : "") + '>' + option + "</option>"; }).join("") + '</select><textarea data-character-event-key="description" placeholder="O que aconteceu e por que isso foi importante?">' + escapeHTML(item.description || "") + '</textarea><button class="character-event-remove" type="button" data-remove-character-event="' + index + '" aria-label="Remover acontecimento">×</button></div>';
    }).join("") + '</div><button class="character-event-add" type="button" data-add-character-event>+ ADICIONAR ACONTECIMENTO</button></div>';
  }

  function characterRangeLabel(field, value) {
    var index = Number(value) - Number(field.min || 0);
    var label = Array.isArray(field.labels) ? field.labels[index] : "";
    return String(value) + (label ? " — " + label : "");
  }

  function allCharacterFields() {
    var sections = CHARACTER_SCHEMA.commonSections.slice();
    Object.keys(CHARACTER_SCHEMA.categorySections || {}).forEach(function (category) {
      sections = sections.concat(CHARACTER_SCHEMA.categorySections[category] || []);
    });
    var seen = {};
    return sections.reduce(function (items, section) {
      section.fields.forEach(function (field) { if (!seen[field.key]) { seen[field.key] = true; items.push(field); } });
      return items;
    }, []);
  }

  function characterFieldByKey(key) {
    return allCharacterFields().find(function (field) { return field.key === key; }) || null;
  }

  function captureCharacterDraft() {
    var draft = ui.characterDraft;
    if (!draft || !el.characterFields) return draft;
    var categoryInput = el.characterFields.querySelector('[data-character-core="category"]');
    var nameInput = el.characterFields.querySelector('[data-character-core="name"]');
    if (categoryInput) draft.category = categoryInput.value;
    if (nameInput) draft.name = clean(nameInput.value);
    var details = draft.details || {};
    allCharacterFields().forEach(function (field) {
      if (field.type === "summary" || field.type === "events") return;
      var inputs = Array.from(el.characterFields.querySelectorAll('[data-character-field="' + field.key + '"]'));
      if (!inputs.length) return;
      if (field.type === "multi") {
        var values = inputs.filter(function (input) { return input.checked; }).map(function (input) { return input.value; });
        var customInput = el.characterFields.querySelector('[data-character-multi-custom="' + field.key + '"]');
        if (customInput) values = values.concat(splitList(customInput.value));
        details[field.key] = Array.from(new Set(values)).slice(0, Number(field.max || 99));
      } else if (field.type === "checkbox") details[field.key] = Boolean(inputs[0].checked);
      else if (field.type === "tags") details[field.key] = splitList(inputs[0].value).slice(0, Number(field.max || 99));
      else if (field.type === "number" || field.type === "range") details[field.key] = inputs[0].value === "" ? "" : Number(inputs[0].value);
      else details[field.key] = clean(inputs[0].value);
    });
    var eventRows = Array.from(el.characterFields.querySelectorAll("[data-character-event-row]"));
    if (eventRows.length || el.characterFields.querySelector("[data-add-character-event]")) {
      details.importantEvents = eventRows.map(function (row) {
        var record = {};
        row.querySelectorAll("[data-character-event-key]").forEach(function (input) { record[input.dataset.characterEventKey] = clean(input.value); });
        return record;
      }).filter(function (record) { return record.title || record.description || record.date; });
    }
    draft.details = details;
    ui.characterDraft = draft;
    return draft;
  }

  function handleCharacterFieldInput(event) {
    if (!ui.characterDraft) return;
    if (event.target.matches('[data-character-core="name"]')) {
      ui.characterDraft.name = event.target.value;
      el.characterPreviewName.textContent = clean(event.target.value || "NOVO PERSONAGEM").toUpperCase();
      el.characterEditorTitle.textContent = ui.editingCharacterId ? clean(event.target.value || "EDITAR PERSONAGEM").toUpperCase() : "NOVO PERSONAGEM";
    }
    if (event.target.matches('input[type="range"][data-character-field]')) {
      var field = characterFieldByKey(event.target.dataset.characterField);
      var output = el.characterFields.querySelector('[data-character-range-output="' + event.target.dataset.characterField + '"]');
      if (field && output) output.textContent = characterRangeLabel(field, Number(event.target.value));
    }
  }

  function handleCharacterFieldChange(event) {
    if (!ui.characterDraft) return;
    if (event.target.matches('[data-character-core="category"]')) {
      captureCharacterDraft();
      ui.relationshipCategory = ui.characterDraft.category;
      renderCharacterEditor();
      return;
    }
    var key = event.target.dataset.characterField;
    var field = key ? characterFieldByKey(key) : null;
    if (field && field.type === "multi" && event.target.checked && field.max) {
      var checked = el.characterFields.querySelectorAll('[data-character-field="' + key + '"]:checked');
      if (checked.length > Number(field.max)) {
        event.target.checked = false;
        toast("Escolha até " + field.max + " opções neste campo.", "error");
        return;
      }
    }
    if (key === "birthDate" && event.target.value) {
      captureCharacterDraft();
      ui.characterDraft.details.approximateAge = calculateAge(event.target.value);
      renderCharacterEditor();
      return;
    }
    if (key === "noExactBirthDate" && event.target.checked) {
      captureCharacterDraft();
      ui.characterDraft.details.birthDate = "";
      renderCharacterEditor();
      return;
    }
    if (key && allCharacterFields().some(function (candidate) { return candidate.when && candidate.when.key === key; })) {
      captureCharacterDraft();
      renderCharacterEditor();
    }
  }

  function handleCharacterFieldClick(event) {
    var add = event.target.closest("[data-add-character-event]");
    var remove = event.target.closest("[data-remove-character-event]");
    if (!add && !remove) return;
    captureCharacterDraft();
    var events = ui.characterDraft.details.importantEvents || [];
    if (add) events.push({ title: "", date: "", importance: "", description: "" });
    else events.splice(Number(remove.dataset.removeCharacterEvent), 1);
    ui.characterDraft.details.importantEvents = events;
    renderCharacterEditor();
  }

  async function handleCharacterImageChange(event) {
    var file = event.target.files && event.target.files[0];
    if (!file || !ui.characterDraft) return;
    var kind = event.target === el.characterAvatarInput ? "avatar" : "banner";
    event.target.value = "";
    try {
      await openCharacterImageEditor(file, kind);
    } catch (error) {
      toast("Não foi possível processar essa imagem.", "error");
    }
  }

  function loadCharacterCropImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var image = new Image();
        image.onerror = reject;
        image.onload = function () { resolve(image); };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function openCharacterImageEditor(file, kind) {
    var image = await loadCharacterCropImage(file);
    var isAvatar = kind === "avatar";
    ui.characterImageEdit = {
      kind: isAvatar ? "avatar" : "banner",
      image: image,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      pointerId: null,
      lastX: 0,
      lastY: 0
    };
    el.characterCropCanvas.width = isAvatar ? 640 : 1440;
    el.characterCropCanvas.height = isAvatar ? 640 : 630;
    el.characterImageEditor.classList.toggle("is-avatar", isAvatar);
    el.characterImageEditor.classList.toggle("is-banner", !isAvatar);
    el.characterCropZoom.value = "100";
    el.characterCropZoomValue.textContent = "100%";
    document.body.classList.add("is-character-image-editor-open");
    if (!el.characterImageEditor.open) el.characterImageEditor.showModal();
    drawCharacterCrop();
    window.setTimeout(function () { el.characterCropCanvas.focus(); }, 40);
  }

  function characterCropMetrics() {
    var edit = ui.characterImageEdit;
    var canvas = el.characterCropCanvas;
    if (!edit || !edit.image || !canvas.width || !canvas.height) return null;
    var baseScale = Math.max(canvas.width / edit.image.naturalWidth, canvas.height / edit.image.naturalHeight);
    var scale = baseScale * edit.zoom;
    var drawWidth = edit.image.naturalWidth * scale;
    var drawHeight = edit.image.naturalHeight * scale;
    var maxX = Math.max(0, (drawWidth - canvas.width) / 2);
    var maxY = Math.max(0, (drawHeight - canvas.height) / 2);
    edit.offsetX = Math.max(-maxX, Math.min(maxX, edit.offsetX));
    edit.offsetY = Math.max(-maxY, Math.min(maxY, edit.offsetY));
    return { drawWidth: drawWidth, drawHeight: drawHeight };
  }

  function drawCharacterCrop() {
    var edit = ui.characterImageEdit;
    var canvas = el.characterCropCanvas;
    var metrics = characterCropMetrics();
    if (!edit || !metrics) return;
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      edit.image,
      (canvas.width - metrics.drawWidth) / 2 + edit.offsetX,
      (canvas.height - metrics.drawHeight) / 2 + edit.offsetY,
      metrics.drawWidth,
      metrics.drawHeight
    );
  }

  function changeCharacterCropZoom(event) {
    var edit = ui.characterImageEdit;
    if (!edit) return;
    edit.zoom = Math.max(1, Math.min(3, Number(event.target.value || 100) / 100));
    el.characterCropZoomValue.textContent = Math.round(edit.zoom * 100) + "%";
    drawCharacterCrop();
  }

  function beginCharacterCropDrag(event) {
    var edit = ui.characterImageEdit;
    if (!edit || (event.pointerType === "mouse" && event.button !== 0)) return;
    edit.dragging = true;
    edit.pointerId = event.pointerId;
    edit.lastX = event.clientX;
    edit.lastY = event.clientY;
    el.characterCropCanvas.classList.add("is-dragging");
    el.characterCropCanvas.setPointerCapture(event.pointerId);
  }

  function moveCharacterCropDrag(event) {
    var edit = ui.characterImageEdit;
    if (!edit || !edit.dragging || edit.pointerId !== event.pointerId) return;
    var rect = el.characterCropCanvas.getBoundingClientRect();
    edit.offsetX += (event.clientX - edit.lastX) * el.characterCropCanvas.width / Math.max(1, rect.width);
    edit.offsetY += (event.clientY - edit.lastY) * el.characterCropCanvas.height / Math.max(1, rect.height);
    edit.lastX = event.clientX;
    edit.lastY = event.clientY;
    drawCharacterCrop();
  }

  function endCharacterCropDrag(event) {
    var edit = ui.characterImageEdit;
    if (!edit || edit.pointerId !== event.pointerId) return;
    edit.dragging = false;
    edit.pointerId = null;
    el.characterCropCanvas.classList.remove("is-dragging");
    if (el.characterCropCanvas.hasPointerCapture(event.pointerId)) el.characterCropCanvas.releasePointerCapture(event.pointerId);
  }

  function nudgeCharacterCrop(event) {
    var edit = ui.characterImageEdit;
    if (!edit || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(event.key) < 0) return;
    event.preventDefault();
    var step = event.shiftKey ? 24 : 8;
    if (event.key === "ArrowLeft") edit.offsetX -= step;
    if (event.key === "ArrowRight") edit.offsetX += step;
    if (event.key === "ArrowUp") edit.offsetY -= step;
    if (event.key === "ArrowDown") edit.offsetY += step;
    drawCharacterCrop();
  }

  function resetCharacterCrop() {
    var edit = ui.characterImageEdit;
    if (!edit) return;
    edit.zoom = 1;
    edit.offsetX = 0;
    edit.offsetY = 0;
    el.characterCropZoom.value = "100";
    el.characterCropZoomValue.textContent = "100%";
    drawCharacterCrop();
  }

  function closeCharacterImageEditor() {
    var edit = ui.characterImageEdit;
    if (edit) edit.dragging = false;
    ui.characterImageEdit = null;
    el.characterCropCanvas.classList.remove("is-dragging");
    document.body.classList.remove("is-character-image-editor-open");
    if (el.characterImageEditor.open) el.characterImageEditor.close();
  }

  function applyCharacterCrop() {
    var edit = ui.characterImageEdit;
    if (!edit || !ui.characterDraft) return;
    drawCharacterCrop();
    var data = el.characterCropCanvas.toDataURL("image/webp", edit.kind === "avatar" ? 0.82 : 0.8);
    if (edit.kind === "avatar") ui.characterDraft.avatarData = data;
    else ui.characterDraft.bannerData = data;
    var label = edit.kind === "avatar" ? "Foto de perfil ajustada." : "Banner ajustado.";
    closeCharacterImageEditor();
    updateCharacterMediaPreview();
    toast(label);
  }

  function updateCharacterMediaPreview() {
    var draft = ui.characterDraft;
    if (!draft) return;
    var initials = characterInitials(draft.name) || "?";
    el.characterPreviewName.textContent = clean(draft.name || "NOVO PERSONAGEM").toUpperCase();
    el.characterPreviewCategory.textContent = characterCategoryMeta(draft.category).label;
    el.characterAvatarPreview.innerHTML = draft.avatarData ? '<img src="' + escapeHTML(draft.avatarData) + '" alt="" />' : "<span>" + escapeHTML(initials) + "</span>";
    el.characterBannerPreview.style.backgroundImage = draft.bannerData ? 'url("' + draft.bannerData + '")' : "";
    el.characterBannerPreview.innerHTML = draft.bannerData ? "" : "<span>IMAGEM DE BANNER</span>";
  }

  function saveCharacterForm(event) {
    event.preventDefault();
    var career = activeCareer();
    var draft = captureCharacterDraft();
    if (!career || !draft) return;
    if (!clean(draft.name)) {
      toast("Informe o nome completo do personagem.", "error");
      var nameInput = el.characterFields.querySelector('[data-character-core="name"]');
      if (nameInput) nameInput.focus();
      return;
    }
    if (!ui.editingCharacterId) {
      var missing = CHARACTER_SCHEMA.quickKeys.filter(function (key) { return !characterValueFilled(draft.details[key]); });
      if (missing.length) {
        var firstField = characterFieldByKey(missing[0]);
        toast("Complete o cadastro rápido: " + (firstField ? firstField.label : missing[0]) + ".", "error");
        return;
      }
    }
    var now = new Date().toISOString();
    if (draft.details.birthDate && !draft.details.noExactBirthDate) draft.details.approximateAge = calculateAge(draft.details.birthDate);
    draft.details.finalAISummary = buildCharacterSummary(draft);
    draft.summary = buildCharacterCardSummary(draft);
    draft.relationship = relationshipScaleLabel(draft.details.relationshipCurrent);
    draft.relationshipLevel = Number.isFinite(Number(draft.details.relationshipCurrent)) ? Math.round((Number(draft.details.relationshipCurrent) - 1) / 6 * 100) : null;
    draft.role = characterRoleFromDetails(draft);
    draft.knownFacts = Array.isArray(draft.details.knownFacts) ? draft.details.knownFacts.slice() : [];
    draft.unknownFacts = Array.isArray(draft.details.unknownFacts) ? draft.details.unknownFacts.slice() : [];
    draft.lastUpdated = now;
    draft.userEditedAt = now;
    var index = career.characters.findIndex(function (character) { return character.id === ui.editingCharacterId; });
    if (index >= 0) {
      draft.id = career.characters[index].id;
      draft.createdAt = career.characters[index].createdAt || draft.createdAt;
      career.characters[index] = normalizeCharacter(draft);
    } else career.characters.push(normalizeCharacter(draft));
    career.updatedAt = now;
    ui.relationshipCategory = draft.category;
    saveState();
    closeCharacterEditor();
    renderRelationships();
    toast(index >= 0 ? "Ficha atualizada e enviada para a memória da IA." : "Personagem criado. Você pode abrir a ficha e adicionar mais detalhes quando quiser.");
  }

  function deleteCurrentCharacter() {
    var career = activeCareer();
    if (!career || !ui.editingCharacterId) return;
    var character = career.characters.find(function (item) { return item.id === ui.editingCharacterId; });
    if (!character || !window.confirm("Excluir a ficha de " + character.name + "? Esta ação não pode ser desfeita.")) return;
    career.characters = career.characters.filter(function (item) { return item.id !== ui.editingCharacterId; });
    career.updatedAt = new Date().toISOString();
    saveState();
    closeCharacterEditor();
    renderRelationships();
    toast("A ficha de " + character.name + " foi excluída e não pode ser recuperada.");
  }

  function characterValueFilled(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    return Boolean(clean(value));
  }

  function relationshipScaleLabel(value) {
    return ["", "Péssima", "Ruim", "Distante", "Neutra", "Boa", "Muito próxima", "Extremamente próxima"][Number(value)] || "Não avaliada";
  }

  function characterRoleFromDetails(character) {
    var details = character.details || {};
    if (character.category === "romance") return clean(details.romanceStatus) || "Relacionamento";
    if (character.category === "professional") return clean(details.professionRole) || "Profissional";
    if (character.category === "team") return clean(details.squadRole) || (details.position ? "Companheiro de time · " + details.position : "Companheiro de time");
    return clean(details.friendshipType) || "Amigo(a)";
  }

  function buildCharacterSummary(character) {
    var details = character.details || {};
    var lines = [
      "Nome: " + (clean(character.name) || "Não informado"),
      "Categoria: " + characterCategoryMeta(character.category).label,
      "Relação atual: " + relationshipScaleLabel(details.relationshipCurrent),
      "Personalidade: " + (Array.isArray(details.personalityTraits) && details.personalityTraits.length ? details.personalityTraits.join(", ") : clean(details.personalityDescription) || "Em aberto"),
      "Forma de falar: " + (Array.isArray(details.speechStyle) && details.speechStyle.length ? details.speechStyle.join(", ") : "Em aberto"),
      "Objetivo atual: " + (clean(details.currentGoal) || "Em aberto"),
      "O que sabe: " + (Array.isArray(details.knownFacts) && details.knownFacts.length ? details.knownFacts.join("; ") : "Nada definido"),
      "O que não sabe: " + (Array.isArray(details.unknownFacts) && details.unknownFacts.length ? details.unknownFacts.join("; ") : "Nada definido"),
      "Regras fixas: " + (clean(details.characterRules) || "Nenhuma regra adicional"),
      "Informações em aberto: " + (clean(details.openInformation) || "Nenhuma")
    ];
    if (clean(details.freeDescription)) lines.push("Descrição livre: " + clean(details.freeDescription));
    return lines.join("\n");
  }

  function buildCharacterCardSummary(character) {
    var details = character.details || {};
    return clean(details.freeDescription)
      || clean(details.personalityDescription)
      || [clean(details.viewOfPlayer), clean(details.currentGoal)].filter(Boolean).join(" ")
      || "A ficha será aprofundada conforme este personagem viver cenas no KICK OFF.";
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
      ["Clube atual", profile.currentClub],
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
    var totalWeight = career.tools.wheelEntries.reduce(function (total, entry) { return total + normalizeWheelChoice(entry).weight; }, 0) || 1;
    el.wheelEntries.innerHTML = career.tools.wheelEntries.map(function (entry, index) {
      var choice = normalizeWheelChoice(entry);
      var percentage = choice.weight / totalWeight * 100;
      return '<div class="wheel-entry"><label class="wheel-weight"><span class="sr-only">Ponderação da possibilidade ' + (index + 1) + '</span><input type="number" min="1" max="999" inputmode="numeric" data-wheel-weight-index="' + index + '" value="' + choice.weight + '" aria-label="Ponderação da possibilidade ' + (index + 1) + '" /></label><label class="wheel-label"><span class="sr-only">Possibilidade ' + (index + 1) + '</span><input type="text" maxlength="80" data-wheel-label-index="' + index + '" value="' + escapeHTML(choice.label) + '" placeholder="Possibilidade ' + (index + 1) + '" /></label><output data-wheel-percentage="' + index + '">' + formatWheelPercentage(percentage) + '</output><button type="button" data-remove-wheel="' + index + '" aria-label="Remover possibilidade" data-tooltip="Remover"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v10m4-10v10m4-10v10M5 5h14M9 5V3.5h6V5m-8 0 1 16h8l1-16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
    }).join("");
    updateWheelVisual();
  }

  function formatWheelPercentage(value) {
    var rounded = Math.round(Number(value) * 10) / 10;
    return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",")) + "%";
  }

  function wheelSegments(career) {
    var choices = career.tools.wheelEntries.map(function (entry, index) {
      var choice = normalizeWheelChoice(entry);
      return { label: choice.label, weight: choice.weight, index: index };
    });
    var filled = choices.filter(function (choice) { return Boolean(choice.label); });
    return filled.length >= 2 ? filled : choices;
  }

  function updateWheelVisual() {
    var career = activeCareer();
    if (!career) return;
    var segments = wheelSegments(career);
    var totalWeight = segments.reduce(function (total, entry) { return total + entry.weight; }, 0) || 1;
    var cursor = 0;
    var stops = [];
    segments.forEach(function (entry) {
      var start = cursor / totalWeight * 100;
      cursor += entry.weight;
      var end = cursor / totalWeight * 100;
      stops.push(WHEEL_COLORS[entry.index % WHEEL_COLORS.length] + " " + start + "% " + end + "%");
    });
    el.wheel.style.background = "conic-gradient(" + stops.join(",") + ")";
  }

  function refreshWheelPercentages(career) {
    var totalWeight = career.tools.wheelEntries.reduce(function (total, entry) { return total + normalizeWheelChoice(entry).weight; }, 0) || 1;
    el.wheelEntries.querySelectorAll("[data-wheel-percentage]").forEach(function (output) {
      var choice = normalizeWheelChoice(career.tools.wheelEntries[Number(output.dataset.wheelPercentage)]);
      output.textContent = formatWheelPercentage(choice.weight / totalWeight * 100);
    });
  }

  function addWheelEntry() {
    var career = activeCareer();
    if (!career || career.tools.wheelEntries.length >= 12) {
      toast("A roleta aceita até 12 possibilidades.", "error");
      return;
    }
    career.tools.wheelEntries.push({ label: "", weight: 1 });
    saveState();
    renderWheelEntries();
    var inputs = el.wheelEntries.querySelectorAll("input");
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  function updateWheelEntry(event) {
    var input = event.target.closest("[data-wheel-label-index], [data-wheel-weight-index]");
    var career = activeCareer();
    if (!input || !career) return;
    if (input.hasAttribute("data-wheel-label-index")) {
      var labelIndex = Number(input.dataset.wheelLabelIndex);
      career.tools.wheelEntries[labelIndex] = normalizeWheelChoice(career.tools.wheelEntries[labelIndex]);
      career.tools.wheelEntries[labelIndex].label = input.value;
    } else {
      var weightIndex = Number(input.dataset.wheelWeightIndex);
      career.tools.wheelEntries[weightIndex] = normalizeWheelChoice(career.tools.wheelEntries[weightIndex]);
      career.tools.wheelEntries[weightIndex].weight = Math.min(999, Math.max(1, Math.round(Number(input.value) || 1)));
    }
    saveState();
    refreshWheelPercentages(career);
    updateWheelVisual();
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
    var options = wheelSegments(career).filter(function (choice) { return Boolean(choice.label); });
    if (options.length < 2) {
      toast("Preencha pelo menos duas possibilidades.", "error");
      return;
    }
    el.spinWheel.disabled = true;
    ui.wheelResult = "";
    el.wheelResult.textContent = "…";
    el.wheelResult.style.transform = "";
    var totalWeight = options.reduce(function (total, choice) { return total + choice.weight; }, 0);
    var ticket = randomInt(totalWeight);
    var selected = options[options.length - 1];
    var cumulative = 0;
    var selectedStart = 0;
    for (var i = 0; i < options.length; i += 1) {
      selectedStart = cumulative;
      cumulative += options[i].weight;
      if (ticket < cumulative) { selected = options[i]; break; }
    }
    var centerAngle = ((selectedStart + selected.weight / 2) / totalWeight) * 360;
    var alignment = (90 - centerAngle - (ui.wheelRotation % 360) + 360) % 360;
    ui.wheelRotation += 1440 + alignment;
    el.wheel.style.transform = "rotate(" + ui.wheelRotation + "deg)";
    window.setTimeout(function () {
      ui.wheelResult = selected.label;
      el.wheelResult.textContent = selected.label;
      el.wheelResult.style.transform = "rotate(" + (-ui.wheelRotation) + "deg)";
      el.spinWheel.disabled = false;
      toast("Resultado da roleta: " + selected.label);
    }, 3850);
  }

  function selectDie(event) {
    var button = event.target.closest("[data-die]");
    if (!button) return;
    ui.dieSides = Number(button.dataset.die);
    document.querySelectorAll("[data-die]").forEach(function (item) { item.classList.toggle("is-active", item === button); });
    el.diceResult.querySelector("strong").textContent = "—";
    ui.lastDice = null;
  }

  function rollDice() {
    var career = activeCareer();
    if (!career) return;
    var result = randomInt(ui.dieSides) + 1;
    ui.lastDice = { sides: ui.dieSides, result: result, createdAt: new Date().toISOString() };
    el.diceResult.querySelector("strong").textContent = String(result);
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

  function splitList(value) {
    if (Array.isArray(value)) return value.map(clean).filter(Boolean);
    var source = String(value == null ? "" : value);
    var parts = /\r?\n/.test(source) ? source.split(/\r?\n/) : source.split(",");
    return parts.map(clean).filter(Boolean);
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

  function formatShortDate(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "").toUpperCase();
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
