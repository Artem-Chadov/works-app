"use strict";

const byId = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
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

const sources = {
  portfolio: "Витрина «Работы»",
  direct: "Яндекс Директ",
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
  demos: "К демо ботов",
  direct: "К объявлению",
  maps: "К карточке",
  service: "К услуге",
  chat: "К диалогу",
  request: "К заявке",
};
const stages = { direct: "works", maps: "works" };
const bookingSteps = [
  {
    control: requestForm.elements.car,
    title: "Выбери тип автомобиля",
    question: "Какой у тебя автомобиль?",
  },
  {
    control: requestForm.elements.time,
    title: "Выбери удобное время",
    question: "Когда тебе удобно приехать?",
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
let source = null;
let method = "form";
let bookingStep = 0;
let lastExchange = null;
let pendingQuestion = null;
let ticket = null;
let nextTicketNumber = 1;

function renderScreen({ focus = true } = {}) {
  const name = trail.at(-1);
  const previous = trail.at(-2);
  const stage = stages[name] ?? name;
  const inDemos = trail[0] === "demos";

  for (const screen of screens) {
    screen.hidden = screen.id !== name;
  }
  for (const step of steps) {
    step.disabled = !trail.includes(step.dataset.step);
    if (step.dataset.step === stage) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  }

  byId("case-overview").hidden = inDemos;
  byId("demo-overview").hidden = !inDemos;
  byId("section-nav").hidden = Boolean(previous);
  byId("works-link").setAttribute("aria-current", inDemos ? "false" : "page");
  byId("demos-link").setAttribute("aria-current", inDemos ? "page" : "false");
  backButton.hidden = !previous;
  byId("back-label").textContent = previous === "request" && method === "neuro"
    ? "К подтверждению"
    : backLabels[previous] ?? "";

  if (name === "service") byId("service-origin").textContent = sources[source];
  if (name === "chat") handOff.disabled = !lastExchange;
  if (name === "request") renderRequest();
  if (name === "admin") renderTicket();

  window.scrollTo(0, 0);
  if (focus) byId(`${name}-title`).focus({ preventScroll: true });
}

function openScreen(name, options) {
  if (name === trail.at(-1) || (name === "admin" && !ticket)) return;
  trail.push(name);
  renderScreen(options);
}

function resetDraft() {
  source = null;
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
  author.textContent = role === "visitor" ? "Ты" : "Нейробот";
  content.textContent = text;
  message.append(author, content);
  thread.append(message);
}

function askQuestion(value) {
  const question = value.trim();
  if (!question) return;

  const normalized = question.toLocaleLowerCase("ru-RU");
  const answers = replies.filter(({ pattern }) => pattern.test(normalized));
  const answer = answers.map(({ text }) => text).join(" ") ||
    "В демо-справке нет ответа. Сохраню вопрос для администратора.";

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
    "Проверь время и автомобиль перед отправкой.";
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
    visitorName.setCustomValidity("Впиши тестовое имя.");
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
}

function saveTicket(details) {
  ticket = {
    number: String(nextTicketNumber).padStart(3, "0"),
    source,
    method,
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
  byId("ticket-excerpt").hidden = !ticket.exchange || ticket.exchange.question === ticket.pendingQuestion;
  byId("ticket-question").textContent = ticket.exchange?.question ?? "";
  byId("ticket-answer").hidden = !ticket.exchange;
  byId("ticket-answer").textContent = ticket.exchange?.answer ?? "";
  byId("ticket-pending").hidden = !ticket.pendingQuestion;
  byId("ticket-pending-question").textContent = ticket.pendingQuestion ?? "";
  byId("ticket-status").textContent = ticket.inProgress ? "В работе" : "Новая";
  byId("take-request").hidden = ticket.inProgress;
}

for (const button of document.querySelectorAll("[data-open]")) {
  button.addEventListener("click", () => openScreen(button.dataset.open));
}

for (const button of document.querySelectorAll("[data-start]")) {
  button.addEventListener("click", () => {
    const entry = button.dataset.start;
    if (source !== entry || ticket) resetDraft();
    source = entry;
    openScreen("service");
  });
}

for (const step of steps) {
  step.addEventListener("click", () => {
    const index = trail.lastIndexOf(step.dataset.step);
    if (index < 0 || index === trail.length - 1) return;
    trail = trail.slice(0, index + 1);
    renderScreen();
  });
}

backButton.addEventListener("click", () => {
  if (trail.length < 2) return;
  trail.pop();
  renderScreen();
});

for (const prompt of document.querySelectorAll(".prompt")) {
  prompt.addEventListener("click", () => askQuestion(prompt.textContent));
}

questionInput.addEventListener("input", () => questionInput.setCustomValidity(""));
questionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!questionInput.value.trim()) {
    questionInput.setCustomValidity("Напиши вопрос.");
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
  bookingOptions.firstElementChild.focus();
});
bookingSubmit.addEventListener("click", () => {
  if (method === "bot" || method === "guided") createTicket();
});

byId("take-request").addEventListener("click", () => {
  ticket.inProgress = true;
  renderTicket();
  byId("ticket-status").focus({ preventScroll: true });
});

byId("restart-button").addEventListener("click", () => {
  resetDraft();
  trail = [trail[0]];
  renderScreen();
});

const query = new URLSearchParams(location.search);
const demo = query.get("demo");
const entry = query.get("entry");
if (demo === "chatbot" || demo === "neuro") {
  trail = ["demos"];
  source = demo;
  method = demo === "chatbot" ? "bot" : "neuro";
  openScreen(demo === "chatbot" ? "request" : "chat", { focus: false });
} else if (query.get("section") === "demos") {
  trail = ["demos"];
  renderScreen({ focus: false });
} else if (entry === "direct" || entry === "maps") {
  openScreen(entry, { focus: false });
} else {
  renderScreen({ focus: false });
}
