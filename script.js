document.documentElement.classList.add("js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealElements = document.querySelectorAll(".reveal");

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => {
    element.classList.add("is-visible");
  });
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
    }
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
}

const progressBarFill = document.getElementById("progress-bar-fill");

function updateProgressBar() {
  if (!progressBarFill) {
    return;
  }

  const scrollTop = window.scrollY;
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
  progressBarFill.style.width = `${progress}%`;
}

window.addEventListener("scroll", updateProgressBar, { passive: true });
window.addEventListener("resize", updateProgressBar);
updateProgressBar();

const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
const trackedSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setActiveNav(sectionId) {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${sectionId}`;
    link.classList.toggle("is-active", isActive);
  });
}

if ("IntersectionObserver" in window && trackedSections.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

      if (visibleEntries.length > 0) {
        setActiveNav(visibleEntries[0].target.id);
      }
    },
    {
      rootMargin: "-30% 0px -55% 0px",
      threshold: [0.15, 0.35, 0.55],
    }
  );

  trackedSections.forEach((section) => {
    sectionObserver.observe(section);
  });

  setActiveNav(trackedSections[0].id);
}

const storagePrefix = "tao-brainstorm:";
const lastSavedKey = `${storagePrefix}meta:lastSavedAt`;
const noteFields = Array.from(document.querySelectorAll("[data-note]"));
const checkFields = Array.from(document.querySelectorAll("[data-check]"));
const summaryOutput = document.getElementById("summary-output");
const saveStatus = document.getElementById("save-status");
const copyButton = document.getElementById("copy-summary");
const exportButton = document.getElementById("export-summary");
const resetButton = document.getElementById("reset-board");

let statusTimerId = 0;

function getNoteKey(field) {
  return `${storagePrefix}${field.dataset.note}`;
}

function getCheckKey(field) {
  return `${storagePrefix}${field.dataset.check}`;
}

function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 150)}px`;
}

function getQuestionLabel(field) {
  return field.closest(".question-card")?.querySelector("span")?.textContent?.trim() || field.dataset.note;
}

function getCheckLabel(field) {
  return field.closest("label")?.textContent?.replace(/\s+/g, " ").trim() || field.dataset.check;
}

function hasUserData() {
  const hasNotes = noteFields.some((field) => field.value.trim().length > 0);
  const hasChecks = checkFields.some((field) => field.checked);
  return hasNotes || hasChecks;
}

function getLastSavedAt() {
  const rawValue = window.localStorage.getItem(lastSavedKey);
  return rawValue ? new Date(rawValue) : null;
}

function setLastSavedAt(date = new Date()) {
  window.localStorage.setItem(lastSavedKey, date.toISOString());
  return date;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatFileDate(date) {
  return date.toISOString().slice(0, 10);
}

function renderSaveStatus() {
  if (!saveStatus) {
    return;
  }

  let lastSavedAt = getLastSavedAt();

  if (hasUserData() && !lastSavedAt) {
    lastSavedAt = setLastSavedAt();
  }

  if (hasUserData() && lastSavedAt) {
    saveStatus.textContent = `Última atualização local: ${formatDateTime(lastSavedAt)}.`;
    return;
  }

  saveStatus.textContent = "Sem respostas locais ainda. O resumo abaixo já guarda a síntese fixa do projeto.";
}

function flashStatus(message) {
  if (!saveStatus) {
    return;
  }

  window.clearTimeout(statusTimerId);
  saveStatus.textContent = message;
  statusTimerId = window.setTimeout(() => {
    renderSaveStatus();
  }, 2200);
}

function buildSummary() {
  const timestamp = getLastSavedAt() || new Date();
  const checklist = checkFields.filter((field) => field.checked).map((field) => `- [x] ${getCheckLabel(field)}`);
  const answers = noteFields.map((field) => {
    const value = field.value.trim() || "em aberto";
    return `- ${getQuestionLabel(field)}: ${value}`;
  });

  return [
    "# TAO · resumo vivo do brainstorming",
    "",
    `Atualizado em: ${formatDateTime(timestamp)}`,
    "",
    "## Síntese estratégica fixa",
    "- TAO deve ocupar o território de joias em prata com pedras naturais, densidade editorial e atmosfera noturna.",
    "- A maior oportunidade percebida está em um público masculino ou unissex que enxerga moda, cultura e ancestralidade como linguagem.",
    "- O elo com a Universo Prata deve existir pela narrativa das pedras; a diferenciação vem do tom mais adulto, tátil e preciso.",
    "- O lote zero precisa ser curto, memorável e fácil de fotografar, explicar e repetir em conteúdo.",
    "",
    "## Decisões e respostas registradas",
    ...answers,
    "",
    "## Checklist em andamento",
    ...(checklist.length > 0 ? checklist : ["- Nenhum item marcado ainda."]),
    "",
  ].join("\n");
}

function renderSummary() {
  if (!summaryOutput) {
    return;
  }

  summaryOutput.textContent = buildSummary();
  summaryOutput.classList.toggle("is-empty", !hasUserData());
}

function persistBoard() {
  setLastSavedAt();
  renderSaveStatus();
  renderSummary();
}

function restoreBoard() {
  noteFields.forEach((field) => {
    const savedValue = window.localStorage.getItem(getNoteKey(field));

    if (savedValue) {
      field.value = savedValue;
    }

    autoResize(field);

    field.addEventListener("input", () => {
      window.localStorage.setItem(getNoteKey(field), field.value);
      autoResize(field);
      persistBoard();
    });
  });

  checkFields.forEach((field) => {
    field.checked = window.localStorage.getItem(getCheckKey(field)) === "true";

    field.addEventListener("change", () => {
      window.localStorage.setItem(getCheckKey(field), String(field.checked));
      persistBoard();
    });
  });
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand("copy");
  document.body.removeChild(textarea);
  return succeeded;
}

async function copySummary() {
  const summary = buildSummary();

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary);
    } else if (!fallbackCopy(summary)) {
      throw new Error("Clipboard unavailable");
    }

    flashStatus("Resumo copiado para a área de transferência.");
  } catch (error) {
    flashStatus("Não foi possível copiar automaticamente. Use o botão de download.");
  }
}

function exportSummary() {
  const summary = buildSummary();
  const timestamp = getLastSavedAt() || new Date();
  const blob = new Blob([summary], { type: "text/markdown;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tao-brainstorm-${formatFileDate(timestamp)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  flashStatus("Resumo exportado em markdown.");
}

function resetBoard() {
  if (!hasUserData()) {
    flashStatus("Nenhuma resposta local para limpar.");
    return;
  }

  const shouldReset = window.confirm("Limpar todas as respostas e o checklist salvos neste navegador?");

  if (!shouldReset) {
    return;
  }

  noteFields.forEach((field) => {
    window.localStorage.removeItem(getNoteKey(field));
    field.value = "";
    autoResize(field);
  });

  checkFields.forEach((field) => {
    window.localStorage.removeItem(getCheckKey(field));
    field.checked = false;
  });

  window.localStorage.removeItem(lastSavedKey);
  renderSummary();
  renderSaveStatus();
  flashStatus("Respostas locais removidas.");
}

restoreBoard();
renderSummary();
renderSaveStatus();

copyButton?.addEventListener("click", copySummary);
exportButton?.addEventListener("click", exportSummary);
resetButton?.addEventListener("click", resetBoard);
