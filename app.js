const initialState = () => ({
  mode: "doubles",
  score: { A: 0, B: 0 },
  servingTeam: "A",
  firstServiceDone: true,
  serverNumber: 2,
  teamCardsSwapped: false,
  voiceEnabled: false,
  history: [],
  servingScore: 0
});

let state = initialState();

const elements = {
  teamAName: document.getElementById("teamAName"),
  teamBName: document.getElementById("teamBName"),
  teamAPanel: document.querySelector(".team-a"),
  teamBPanel: document.querySelector(".team-b"),
  sharedActionPanel: document.querySelector(".shared-action-panel"),
  pointButton: document.getElementById("pointButton"),
  teamAScore: document.getElementById("teamAScore"),
  teamBScore: document.getElementById("teamBScore"),
  servingTeamLabel: document.getElementById("servingTeamLabel"),
  teamAServerLabel: document.getElementById("teamAServerLabel"),
  teamACourtLabel: document.getElementById("teamACourtLabel"),
  teamBServerLabel: document.getElementById("teamBServerLabel"),
  teamBCourtLabel: document.getElementById("teamBCourtLabel"),
  calloutText: document.getElementById("calloutText"),
  resetButton: document.getElementById("resetButton"),
  faultButton: document.getElementById("faultButton"),
  switchTeamsButton: document.getElementById("switchTeamsButton"),
  undoButton: document.getElementById("undoButton"),
  voiceButton: document.getElementById("voiceButton"),
  modeButtons: [...document.querySelectorAll(".mode-button")]
};

function snapshot() {
  state.history.push(JSON.stringify({
    mode: state.mode,
    score: state.score,
    servingTeam: state.servingTeam,
    firstServiceDone: state.firstServiceDone,
    serverNumber: state.serverNumber,
    teamCardsSwapped: state.teamCardsSwapped,
    voiceEnabled: state.voiceEnabled
  }));
}

function restoreSnapshot() {
  const previous = state.history.pop();

  if (!previous) {
    return;
  }

  const parsed = JSON.parse(previous);
  state = {
    ...state,
    ...parsed,
    history: state.history
  };
  render();
}

function getTeamName(team) {
  const value = team === "A" ? elements.teamAName.value.trim() : elements.teamBName.value.trim();
  return value || `Team ${team}`;
}

function otherTeam(team) {
  return team === "A" ? "B" : "A";
}

function getServerDisplay() {
  if (state.mode === "singles") {
    return "Single Server";
  }

  return state.serverNumber === 1 ? "1st Server" : "2nd Server";
}

function getServerCalloutValue() {
  if (state.mode === "singles") {
    return `${state.score.A} ${state.score.B}`;
  }

  return `${state.score.A} ${state.score.B} ${state.serverNumber}`;
}

function getCourtSide() {
  const servingScore = state.servingScore;
  return servingScore % 2 === 0 ? "Even" : "Odd";
}

function getWinningTeam() {
  const { A, B } = state.score;
  const lead = Math.abs(A - B);

  if (A >= 11 || B >= 11) {
    if (lead >= 2) {
      return A > B ? "A" : "B";
    }
  }

  return null;
}

function setVoiceButtonState() {
  elements.voiceButton.textContent = state.voiceEnabled ? "Voice On" : "Voice Off";
  elements.voiceButton.setAttribute("aria-pressed", String(state.voiceEnabled));
}

function pickPreferredVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();

  if (!voices.length) {
    return null;
  }

  const preferredNames = [
    "Samantha",
    "Aria",
    "Jenny",
    "Ava",
    "Natasha",
    "Zira",
    "Google US English"
  ];

  const femaleHints = [
    "female",
    "woman",
    "girl",
    "samantha",
    "aria",
    "jenny",
    "ava",
    "natasha",
    "zira",
    "susan",
    "victoria",
    "karen"
  ];

  const byPreferredName = voices.find((voice) =>
    preferredNames.some((name) => voice.name.toLowerCase().includes(name.toLowerCase()))
  );

  if (byPreferredName) {
    return byPreferredName;
  }

  const byHint = voices.find((voice) => {
    const haystack = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    return femaleHints.some((hint) => haystack.includes(hint));
  });

  if (byHint) {
    return byHint;
  }

  const englishVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
  return englishVoice || voices[0];
}

function speakLine(text) {
  if (!state.voiceEnabled || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const preferredVoice = pickPreferredVoice();

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang;
  }

  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function buildActionVoiceLine(team, winner) {
  if (winner) {
    return `${getTeamName(winner)} takes it. Final score, ${state.score.A} to ${state.score.B}.`;
  }

  const scoringName = getTeamName(team);
  const servingName = getTeamName(state.servingTeam);
  const scoreLine = state.mode === "singles"
    ? `${state.score.A} ${state.score.B}`
    : `${state.score.A} ${state.score.B} ${state.serverNumber}`;
  const opponent = otherTeam(team);
  const scoringScore = state.score[team];
  const opponentScore = state.score[opponent];
  const hasGamePoint = scoringScore >= 10 && scoringScore - opponentScore >= 1;

  if (hasGamePoint) {
    return `Point to ${scoringName}. Game point here. ${servingName} to serve, ${scoreLine}.`;
  }

  return `Point to ${scoringName}. ${servingName} to serve, ${scoreLine}.`;
}

function buildFaultVoiceLine() {
  const servingName = getTeamName(state.servingTeam);
  const serverLine = state.mode === "singles"
    ? "Single server"
    : state.serverNumber === 1 ? "First server" : "Second server";
  const scoreLine = state.mode === "singles"
    ? `${state.score.A} ${state.score.B}`
    : `${state.score.A} ${state.score.B} ${state.serverNumber}`;

  return `Side out. Service goes to ${servingName}. ${serverLine}. The score, ${scoreLine}.`;
}

function handlePoint(team) {
  if (team !== state.servingTeam) {
    return;
  }

  snapshot();
  state.score[team] += 1;
  state.servingTeam = team;
  state.servingScore += 1;
  if (state.mode === "singles") {
    state.serverNumber = 1;
  }

  render();
  speakLine(buildActionVoiceLine(team, getWinningTeam()));
}

function handleFault() {
  snapshot();

  if (state.mode === "singles") {
    state.servingTeam = otherTeam(state.servingTeam);
    state.serverNumber = 1;
    render();
    speakLine(buildFaultVoiceLine());
    return;
  }

  if (!state.firstServiceDone) {
    state.firstServiceDone = true;
    state.serverNumber = 1;
    state.servingTeam = otherTeam(state.servingTeam);
    render();
    speakLine(buildFaultVoiceLine());
    return;
  }

  if (state.serverNumber === 1) {
    state.serverNumber = 2;
    state.servingScore += 1;
  } else {
    state.serverNumber = 1;
    state.servingTeam = otherTeam(state.servingTeam);
    state.servingScore = 0;
  }

  render();
  speakLine(buildFaultVoiceLine());
}

function handleModeChange(mode) {
  if (state.mode === mode) {
    return;
  }

  snapshot();
  state.mode = mode;

  if (mode === "singles") {
    state.serverNumber = 1;
    state.firstServiceDone = true;
  } else {
    const openingServe = state.score.A === 0 && state.score.B === 0;
    state.serverNumber = openingServe ? 2 : 1;
    state.firstServiceDone = !openingServe;
  }

  render();
}

function handleReset() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  state = initialState();
  setModeButtonState();
  render();
}

function handleVoiceToggle() {
  state.voiceEnabled = !state.voiceEnabled;
  setVoiceButtonState();

  if (!state.voiceEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    return;
  }

  speakLine(elements.calloutText.textContent);
}

function handleSwitchTeamCards() {
  snapshot();
  state.teamCardsSwapped = !state.teamCardsSwapped;
  render();
  speakLine("Team cards switched.");
}

function addSharedButtonFeedback(button) {
  let clearPressedTimer = null;

  function clearPressedState() {
    button.classList.remove("is-pressed");
  }

  function setPressedState() {
    button.classList.add("is-pressed");

    if (clearPressedTimer) {
      window.clearTimeout(clearPressedTimer);
    }

    clearPressedTimer = window.setTimeout(clearPressedState, 160);
  }

  button.addEventListener("pointerdown", setPressedState);
  button.addEventListener("pointerup", clearPressedState);
  button.addEventListener("pointercancel", clearPressedState);
  button.addEventListener("pointerleave", clearPressedState);
  button.addEventListener("click", setPressedState);
}

function setModeButtonState() {
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
}

function render() {
  const winner = getWinningTeam();
  const servingName = getTeamName(state.servingTeam);

  elements.teamAPanel.style.order = state.teamCardsSwapped ? "2" : "1";
  elements.teamBPanel.style.order = state.teamCardsSwapped ? "1" : "2";
  elements.sharedActionPanel.style.order = "3";

  elements.teamAScore.textContent = state.score.A;
  elements.teamBScore.textContent = state.score.B;
  elements.servingTeamLabel.textContent = servingName;
  setModeButtonState();
  setVoiceButtonState();

  const serverDisplay = getServerDisplay();
  const courtDisplay = getCourtSide();
  const teamAServing = state.servingTeam === "A";
  const teamBServing = state.servingTeam === "B";

  elements.teamAServerLabel.textContent = teamAServing ? serverDisplay : "Receiving";
  elements.teamACourtLabel.textContent = teamAServing ? courtDisplay : "Waiting";
  elements.teamBServerLabel.textContent = teamBServing ? serverDisplay : "Receiving";
  elements.teamBCourtLabel.textContent = teamBServing ? courtDisplay : "Waiting";

  elements.pointButton.disabled = Boolean(winner);
  elements.pointButton.textContent = winner ? "Game Over" : `+ Point for ${servingName}`;
  elements.pointButton.classList.toggle("is-team-a", state.servingTeam === "A" && !winner);
  elements.pointButton.classList.toggle("is-team-b", state.servingTeam === "B" && !winner);

  elements.teamAPanel.classList.toggle("is-serving", state.servingTeam === "A" && !winner);
  elements.teamBPanel.classList.toggle("is-serving", state.servingTeam === "B" && !winner);

  if (winner) {
    elements.calloutText.textContent = `${getTeamName(winner)} wins ${state.score.A}-${state.score.B}.`;
    return;
  }

  elements.calloutText.textContent = `${servingName} serving, ${getServerCalloutValue()}.`;
}

elements.pointButton.addEventListener("click", () => handlePoint(state.servingTeam));

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => handleModeChange(button.dataset.mode));
});

elements.faultButton.addEventListener("click", handleFault);
elements.switchTeamsButton.addEventListener("click", handleSwitchTeamCards);
elements.undoButton.addEventListener("click", restoreSnapshot);
elements.resetButton.addEventListener("click", handleReset);
elements.voiceButton.addEventListener("click", handleVoiceToggle);
elements.teamAName.addEventListener("input", render);
elements.teamBName.addEventListener("input", render);
elements.teamAName.addEventListener("focus", (event) => event.target.select());
elements.teamBName.addEventListener("focus", (event) => event.target.select());

[...elements.sharedActionPanel.querySelectorAll("button")].forEach(addSharedButtonFeedback);

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    if (state.voiceEnabled) {
      setVoiceButtonState();
    }
  };
}

render();
