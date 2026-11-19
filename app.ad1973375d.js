"use strict";

const byId = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
const sectionLinks = [...document.querySelectorAll("[data-section]")];
const steps = [...document.querySelectorAll("[data-step]")];
const methodButtons = [...document.querySelectorAll("[data-method]")];
const backButton = byId("back-button");
const thread = byId("thread");
const firstMessage = byId("first-message");
const questionForm = byId("question-form");
const questionInput = byId("question");
const requestForm = byId("request-form");
const visitorName = byId("visitor-name");
const bookingOptions = byId("booking-options");
const bookingSubmit = byId("booking-submit");
const bookingBack = byId("booking-back");
const handOff = byId("hand-off");
const portfolioCases = new Set(["transkanada", "pablo", "elementaqua"]);
const inquiryPages = {
  works: { caseId: "home", label: "Главная", slot: "home-contact" },
  services: { caseId: "services", label: "Услуги", slot: "services-contact" },
};
const defaultTitle = document.title;

const sources = {
  portfolio: "Витрина «Работы»",
  direct: "Яндекс Директ",
  target: "Таргет",
  maps: "Яндекс Карты",
  chatbot: "Демо чат-бота",
  neuro: "Демо нейробота",
};

const methods = {
  form: "Форма на сайте",
  guided: "Пошаговая запись",
  bot: "Чат-бот",
  neuro: "Нейробот",
};
const backLabels = {
  works: "К работам",
  services: "К услугам",
  demos: "К демо ботов",
  offer: "К описанию услуги",
  direct: "К объявлению",
  target: "К рекламе",
  maps: "К карточке",
  service: "К услуге",
  chat: "К диалогу",
  request: "К заявке",
  admin: "К администратору",
};
const stages = { direct: "works", target: "works", maps: "works" };
const bookingSteps = [
  {
    control: requestForm.elements.car,
    title: "Выберите тип автомобиля",
    question: "На какой машине приедете?",
  },
  {
    control: requestForm.elements.time,
    title: "Выберите удобное время",
    question: "Когда вам удобно приехать?",
  },
];

const replies = [
  {
    pattern: /цен[ауеы]|прайс|стоимост|сколько\s+(это\s+)?(стоит|стоят|рублей)|сколько\s+будет\s+стоить|₽/u,
    text: "В этом демо химчистка салона стоит от 6 000 ₽.",
  },
  {
    pattern: /сколько\s+(по\s+)?времени|сколько\s+(это\s+)?(длится|занимает|час)|как\s+долго|длительност/u,
    text: "В демо-справке на химчистку заложено 4–6 часов.",
  },
  {
    pattern: /входит|чистят|чистите|состав|сидень|что\s+(вы\s+)?моете/u,
    text: "В демо-комплекс входят сиденья, коврики и пластик салона.",
  },
];

let trail = ["works"];
let selectedOffer = null;
let source = null;
let creative = null;
let reportChannel = "all";
let method = "form";
let bookingStep = 0;
let lastExchange = null;
let pendingQuestion = null;
let ticket = null;
let nextTicketNumber = 1;

function stepScreen(step) {
  return step.dataset.step === "works" ? trail[0] : step.dataset.step;
}

function discussContext(name) {
  if (Object.hasOwn(inquiryPages, name)) return inquiryPages[name];
  if (name === "offer") return { caseId: `service-${selectedOffer}`, label: serviceOffers.title(selectedOffer), slot: "offer-contact" };
  if (portfolioCases.has(name)) return { caseId: name, label: byId(`${name}-title`).textContent };
  if (name === "report") return { caseId: "report", label: "SF WASH · Учебный отчёт" };

  let caseId = null;
  if (promotions.hasChannel(name)) caseId = name;
  if (name === "service" || name === "chat") caseId = source;
  if (name === "admin" || name === "request") caseId = ticket?.source ?? source;
  if (!caseId) return null;

  const variant = caseId === "target"
    ? (name === "target" ? promotions.creativeLabel() : ticket?.creative ?? creative)
    : null;
  const origin = caseId === "portfolio" ? "SF WASH" : `SF WASH · ${sources[caseId]}`;
  return { caseId, variant, label: variant ? `${origin} · ${variant}` : origin };
}

function renderDiscussAction(name) {
  const context = discussContext(name);
  const resolve = context ? () => discussContext(name) : null;
  const slot = byId(context?.slot ?? name);
  inquiries.place(slot, resolve);
}

function sectionAddress(name) {
  const address = new URL(location.href);
  for (const key of ["case", "demo", "entry", "report", "from", "offer", "service", "section"]) {
    address.searchParams.delete(key);
  }
  if (name === "offer") address.searchParams.set("service", selectedOffer);
  else if (name !== "works") address.searchParams.set("section", name);
  if (name !== "services" && !telegramWorks.hasLaunchFragment(address.hash)) address.hash = "";
  if (address.pathname.endsWith("/index.html")) address.pathname = address.pathname.slice(0, -"index.html".length);
  return address;
}

function syncSectionAddress(name) {
  if (location.protocol === "file:") return;
  const address = sectionAddress(name);
  if (address.href !== location.href) history.replaceState(history.state, "", address);
}

function renderScreen({ focus = true } = {}) {
  const name = trail.at(-1);
  const previous = trail.at(-2);
  const stage = stages[name] ?? name;
  const section = trail[0];
  const inHome = name === "works";
  const inHub = !previous;
  const inDemos = section === "demos";
  const inOffer = name === "offer";
  const inPortfolio = name === "services" || portfolioCases.has(name);
  const inReport = name === "report";
  const screenTitle = byId(`${name}-title`);

  for (const screen of screens) {
    screen.hidden = screen.id !== name;
  }
  for (const step of steps) {
    step.disabled = !trail.includes(stepScreen(step));
    if (step.dataset.step === stage) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  }

  byId("first-step-label").textContent = section === "services" ? "Услуги" : "Работы";
  document.querySelector(".layout").classList.toggle("layout-hub", inHub || inOffer);
  byId("portfolio-footer").hidden = !inHub && !inOffer;
  if (inHub || inOffer) syncSectionAddress(name);
  byId("case-overview").hidden = inHome || inDemos || inPortfolio || inReport || inOffer || source === "chatbot" || source === "neuro";
  byId("demo-overview").hidden = !inDemos && source !== "chatbot" && source !== "neuro";
  byId("portfolio-overview").hidden = !inPortfolio;
  byId("report-overview").hidden = !inReport;
  byId("demo-label").hidden = inHub || inOffer;
  byId("section-nav").hidden = Boolean(previous);
  for (const link of sectionLinks) {
    link.setAttribute("aria-current", link.dataset.section === section ? "page" : "false");
  }
  backButton.hidden = !previous;
  telegramWorks.setBack(Boolean(previous));
  byId("back-label").textContent = previous === "request" && method === "neuro"
    ? "К подтверждению"
    : backLabels[previous] ?? "";

  if (name === "service") {
    byId("service-origin").textContent = sources[source];
    byId("service-creative").hidden = !creative;
    byId("service-creative").textContent = creative ? `Объявление «${creative}»` : "";
  }
  if (inOffer) serviceOffers.render(selectedOffer);
  if (name === "chat") handOff.disabled = !lastExchange;
  if (name === "request") renderRequest();
  if (name === "admin") renderTicket();
  if (inReport) promotions.showReport(reportChannel, previous === "admin" ? ticket : null);
  renderDiscussAction(name);

  document.title = inHome ? defaultTitle : `${screenTitle.textContent} — Работы`;
  const promotionHeading = name === "services" && location.hash === "#promotion-title" ? byId("promotion-title") : null;
  if (promotionHeading) promotionHeading.scrollIntoView({ block: "start" });
  else window.scrollTo(0, 0);
  if (focus) {
    (promotionHeading ?? screenTitle).focus({ preventScroll: true });
    workMotion.play(byId(name), "screen");
  }
}

function openScreen(name, options) {
  if (name === trail.at(-1) || (name === "admin" && !ticket)) return;
  trail.push(name);
  renderScreen(options);
}

function resetDraft() {
  source = null;
  creative = null;
  method = "form";
  bookingStep = 0;
  lastExchange = null;
  pendingQuestion = null;
  ticket = null;
  thread.replaceChildren(firstMessage);
  questionForm.reset();
  requestForm.reset();
  questionInput.setCustomValidity("");
  visitorName.setCustomValidity("");
}

function addMessage(role, text) {
  const message = document.createElement("div");
  const author = document.createElement("span");
  const content = document.createElement("p");

  message.className = `message message-${role}`;
  author.className = "message-author";
  author.textContent = role === "visitor" ? "Вы" : "Нейробот";
  content.textContent = text;
  message.append(author, content);
  thread.append(message);
  workMotion.play(message);
}

function askQuestion(value) {
  const question = value.trim();
  if (!question) return;

  const normalized = question.toLocaleLowerCase("ru-RU");
  const answers = replies.filter(({ pattern }) => pattern.test(normalized));
  const answer = answers.map(({ text }) => text).join(" ") ||
    "В справке про это ничего нет. Вопрос можно передать администратору.";

  if (!answers.length) pendingQuestion = question;

  lastExchange = { question, answer };
  addMessage("visitor", question);
  addMessage("bot", answer);
  handOff.disabled = false;
  questionForm.reset();
  thread.scrollTop = thread.scrollHeight;
}

function renderBooking() {
  const step = bookingSteps[bookingStep];
  const ready = !step;
  const isBot = method === "bot";
  byId("booking-message").classList.toggle("message-bot", isBot);
  byId("booking-author").textContent = isBot ? "Чат-бот" : `Шаг ${bookingStep + 1} из 3`;
  byId("booking-question").textContent = (isBot ? step?.question : step?.title) ??
    "Проверьте время и автомобиль перед отправкой.";
  byId("booking-review").hidden = !ready;
  bookingSubmit.hidden = !ready;
  bookingBack.hidden = bookingStep === 0;
  bookingBack.textContent = ready ? "Изменить время" : "Изменить автомобиль";
  bookingOptions.hidden = ready;
  bookingOptions.replaceChildren();

  if (ready) {
    byId("booking-car").textContent = requestForm.elements.car.value;
    byId("booking-time").textContent = requestForm.elements.time.value;
    return;
  }

  for (const option of step.control.options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-secondary";
    button.textContent = option.text;
    button.addEventListener("click", () => {
      step.control.value = option.value;
      bookingStep += 1;
      renderBooking();
      workMotion.play(byId("booking-message"));
      (bookingOptions.firstElementChild ?? bookingSubmit).focus();
    });
    bookingOptions.append(button);
  }
}

function renderRequest() {
  const isQuestion = method === "neuro";
  const isBot = method === "bot";
  byId("request-title").textContent = isQuestion ? "Передача вопроса" : isBot ? "Чат-бот записи" : "Тестовая заявка";
  byId("request-body").hidden = Boolean(ticket);
  byId("request-success").hidden = !ticket;
  renderDiscussAction("request");
  if (ticket) {
    byId("success-title").textContent = isQuestion ? "Вопрос передан" : "Заявка создана";
    byId("success-description").textContent = isQuestion
      ? `Тестовый вопрос № ${ticket.number} появился в демо-входящих.`
      : `Тестовая заявка № ${ticket.number} готова к просмотру.`;
    return;
  }

  byId("method-switch").hidden = isBot;
  for (const button of methodButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.method === method));
  }
  requestForm.hidden = method !== "form";
  byId("booking").hidden = method === "form";
  if (method !== "form") renderBooking();
}

function createTicket() {
  if (ticket || !source || trail.at(-1) !== "request") return;
  if (method !== "form" && bookingStep !== bookingSteps.length) return;

  const visitor = (method === "form" ? visitorName.value : visitorName.defaultValue).trim();
  if (!visitor) {
    visitorName.setCustomValidity("Впишите имя для теста.");
    visitorName.reportValidity();
    return;
  }

  saveTicket({
    visitor,
    car: requestForm.elements.car.value,
    time: requestForm.elements.time.value,
  });
  renderRequest();
  window.scrollTo(0, 0);
  byId("success-title").focus({ preventScroll: true });
  workMotion.play(byId("request-success"), "screen");
}

function saveTicket(details) {
  ticket = {
    number: String(nextTicketNumber).padStart(3, "0"),
    source,
    method,
    creative,
    ...details,
    exchange: lastExchange,
    pendingQuestion,
    inProgress: false,
  };
  nextTicketNumber += 1;
}

function renderTicket() {
  const isQuestion = ticket.method === "neuro";
  byId("ticket-number").textContent = isQuestion ? `Тестовый вопрос № ${ticket.number}` : `Тестовая заявка № ${ticket.number}`;
  byId("ticket-title").textContent = isQuestion ? "Вопрос о химчистке" : "Химчистка салона";
  byId("admin-description").textContent = isQuestion ? "Вопросы из демо нейробота" : "Тестовые входящие SF WASH";
  byId("restart-button").textContent = trail[0] === "demos" ? "К демо ботов" : "Пройти ещё раз";
  byId("ticket-source").textContent = sources[ticket.source];
  byId("ticket-method").textContent = methods[ticket.method];
  byId("ticket-name").textContent = ticket.visitor;
  byId("ticket-car-row").hidden = !ticket.car;
  byId("ticket-time-row").hidden = !ticket.time;
  byId("ticket-car").textContent = ticket.car ?? "";
  byId("ticket-time").textContent = ticket.time ?? "";
  byId("ticket-creative-row").hidden = !ticket.creative;
  byId("ticket-creative").textContent = ticket.creative ?? "";
  byId("ticket-excerpt").hidden = !ticket.exchange || ticket.exchange.question === ticket.pendingQuestion;
  byId("ticket-question").textContent = ticket.exchange?.question ?? "";
  byId("ticket-answer").hidden = !ticket.exchange;
  byId("ticket-answer").textContent = ticket.exchange?.answer ?? "";
  byId("ticket-pending").hidden = !ticket.pendingQuestion;
  byId("ticket-pending-question").textContent = ticket.pendingQuestion ?? "";
  byId("ticket-status").textContent = ticket.inProgress ? "В работе" : "Новая";
  byId("take-request").hidden = ticket.inProgress;
  renderTicketHistory(isQuestion);
  const reportButton = byId("ticket-report");
  reportButton.hidden = !promotions.hasChannel(ticket.source);
  reportButton.dataset.reportSource = ticket.source;
}

function renderTicketHistory(isQuestion) {
  byId("ticket-history-title").textContent = isQuestion ? "История вопроса" : "История заявки";
  const events = [`Источник — ${sources[ticket.source]}`];
  events.push(isQuestion ? "Вопрос появился во входящих" : "Заявка появилась во входящих");
  if (ticket.inProgress) events.push("Администратор взял в работу");
  byId("ticket-history").replaceChildren(...events.map((event) => {
    const row = document.createElement("li");
    row.textContent = event;
    return row;
  }));
}

for (const button of document.querySelectorAll("[data-open]")) {
  button.addEventListener("click", () => {
    if (button.dataset.open === "report") {
      const channel = button.dataset.reportSource;
      reportChannel = promotions.hasChannel(channel) ? channel : "all";
    }
    openScreen(button.dataset.open);
  });
}

for (const button of document.querySelectorAll("[data-start]")) {
  button.addEventListener("click", () => {
    const entry = button.dataset.start;
    const entryCreative = entry === "target" ? promotions.creativeLabel() : null;
    if (source !== entry || creative !== entryCreative || ticket) resetDraft();
    source = entry;
    creative = entryCreative;
    openScreen("service");
  });
}

for (const step of steps) {
  step.addEventListener("click", () => {
    const index = trail.lastIndexOf(stepScreen(step));
    if (index < 0 || index === trail.length - 1) return;
    trail = trail.slice(0, index + 1);
    renderScreen();
  });
}

function goBack() {
  if (byId("inquiry-dialog").open) {
    byId("inquiry-dialog").close();
    return;
  }
  if (trail.length < 2) return;
  trail.pop();
  const destination = trail.at(-1);
  const returnsToAddress = trail.length === 1 || destination === "offer";
  const previousAddress = history.state?.worksFrom;
  if (returnsToAddress && previousAddress?.split("#")[0] === sectionAddress(destination).href.split("#")[0]) {
    history.back();
    return;
  }
  renderScreen();
}

backButton.addEventListener("click", goBack);
telegramWorks.onBack(goBack);

for (const prompt of byId("chat").querySelectorAll(".prompts .prompt")) {
  prompt.addEventListener("click", () => askQuestion(prompt.textContent));
}

questionInput.addEventListener("input", () => questionInput.setCustomValidity(""));
questionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!questionInput.value.trim()) {
    questionInput.setCustomValidity("Напишите вопрос.");
    questionInput.reportValidity();
    return;
  }
  askQuestion(questionInput.value);
  questionInput.focus();
});

handOff.addEventListener("click", () => {
  if (!lastExchange || source !== "neuro" || trail.at(-1) !== "chat") return;
  if (ticket?.exchange !== lastExchange) saveTicket({ visitor: visitorName.defaultValue });
  openScreen("request", { focus: false });
  byId("success-title").focus({ preventScroll: true });
});

visitorName.addEventListener("input", () => visitorName.setCustomValidity(""));
requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (method === "form") createTicket();
});

for (const button of methodButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.method === method) return;
    method = button.dataset.method;
    renderRequest();
  });
}

bookingBack.addEventListener("click", () => {
  bookingStep -= 1;
  renderBooking();
  workMotion.play(byId("booking-message"));
  bookingOptions.firstElementChild.focus();
});
bookingSubmit.addEventListener("click", () => {
  if (method === "bot" || method === "guided") createTicket();
});

byId("take-request").addEventListener("click", () => {
  ticket.inProgress = true;
  renderTicket();
  workMotion.play(byId("ticket-history").lastElementChild);
  byId("ticket-status").focus({ preventScroll: true });
});

byId("restart-button").addEventListener("click", () => {
  resetDraft();
  trail = trail.includes("offer") ? ["services", "offer"] : [trail[0]];
  renderScreen();
});

function loadRoute({ focus = false } = {}) {
  if (byId("inquiry-dialog").open) byId("inquiry-dialog").close();
  const query = new URLSearchParams(location.search);
  const demo = query.get("demo");
  const entry = query.get("entry");
  const project = query.get("case");
  const section = query.get("section");
  const report = query.get("report");
  const offer = query.get("offer");
  const service = query.get("service");
  selectedOffer = serviceOffers.has(offer) ? offer : null;
  trail = selectedOffer ? ["services", "offer"] : ["works"];
  resetDraft();

  const options = { focus };
  if (demo === "chatbot" || demo === "neuro") {
    if (!selectedOffer) trail = ["demos"];
    source = demo;
    method = demo === "chatbot" ? "bot" : "neuro";
    openScreen(demo === "chatbot" ? "request" : "chat", options);
  } else if (portfolioCases.has(project)) {
    if (!selectedOffer) trail = [query.get("from") === "works" ? "works" : "services"];
    openScreen(project, options);
  } else if (report === "all" || promotions.hasChannel(report)) {
    trail = ["services"];
    reportChannel = report;
    openScreen("report", options);
  } else if (serviceOffers.has(service)) {
    trail = ["services"];
    selectedOffer = service;
    openScreen("offer", options);
  } else if (section === "demos" || section === "services") {
    trail = [section];
    renderScreen(options);
  } else if (entry === "portfolio") {
    source = entry;
    openScreen("service", options);
  } else if (promotions.hasChannel(entry)) {
    if (!selectedOffer && query.get("from") === "services") trail = ["services"];
    openScreen(entry, options);
  } else {
    trail = ["works"];
    renderScreen(options);
  }
}

function routePath(address) {
  return address.pathname.replace(/index\.html$/, "");
}

document.querySelector(".app").addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const link = event.target.closest("a[href]");
  if (!link || link.target || location.protocol === "file:") return;
  const destination = new URL(link.href);
  if (destination.origin !== location.origin || routePath(destination) !== routePath(location)) return;
  event.preventDefault();
  destination.pathname = routePath(destination);
  if (telegramWorks.hasLaunchFragment(location.hash)) destination.hash = location.hash;
  if (destination.href !== location.href) {
    const from = new URL(location.href);
    if (telegramWorks.hasLaunchFragment(from.hash)) from.hash = "";
    history.pushState({ worksFrom: from.href }, "", destination);
  }
  loadRoute({ focus: true });
});

window.addEventListener("popstate", () => loadRoute({ focus: true }));
loadRoute();
