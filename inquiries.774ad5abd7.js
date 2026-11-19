const inquiries = (() => {
  "use strict";

  const endpoint = "https://artem-works-inquiries.artem-sites-pskov.workers.dev/inquiries";
  const byId = (id) => document.getElementById(id);
  const action = byId("case-contact");
  const openButton = byId("discuss-button");
  const dialog = byId("inquiry-dialog");
  const form = byId("inquiry-form");
  const contact = form.elements.contact;
  const details = form.elements.details;
  const submit = byId("inquiry-submit");
  const result = byId("inquiry-result");
  const notice = byId("inquiry-error");
  const drafts = new Map();
  let resolveContext = null;
  let active = null;

  function setFieldError(field, message) {
    const error = byId(`${field.id}-error`);
    error.textContent = message;
    error.hidden = !message;
    if (message) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
  }

  function updateCount() {
    byId("inquiry-details-count").textContent = `${details.value.length} / 1 500`;
  }

  function renderStatus() {
    form.hidden = Boolean(active.reference);
    result.hidden = !active.reference;
    submit.disabled = active.sending;
    contact.readOnly = active.sending;
    details.readOnly = active.sending;
    submit.textContent = active.sending ? "Отправляем…" : "Отправить заявку";
    notice.textContent = active.error;
    notice.hidden = !active.error;
    byId("inquiry-fallback").hidden = !active.error;
    if (active.reference) {
      byId("inquiry-reference").textContent = `Номер заявки — ${active.reference}`;
    }
  }

  function open() {
    const context = resolveContext?.();
    if (!context) return;
    const key = `${context.caseId}:${context.variant ?? ""}`;
    if (!drafts.has(key)) {
      drafts.set(key, { key, context, contact: "", details: "", error: "", sending: false });
    }
    active = drafts.get(key);
    byId("inquiry-origin").textContent = context.label;
    byId("inquiry-done").textContent = context.slot ? "Готово" : "К кейсу";
    contact.value = active.contact;
    details.value = active.details;
    setFieldError(contact, "");
    setFieldError(details, "");
    updateCount();
    renderStatus();
    dialog.showModal();
    telegramWorks.setDialog(true);
    workMotion.play(dialog);
    if (active.reference) byId("inquiry-success").focus();
  }

  function place(screen, getContext) {
    resolveContext = getContext;
    action.hidden = !getContext;
    openButton.disabled = !getContext;
    if (getContext && action.parentElement !== screen) screen.append(action);
  }

  function getAttempt(entry) {
    const replyTo = entry.contact.trim();
    const brief = entry.details.trim();
    if (entry.attempt?.contact === replyTo && entry.attempt.details === brief) return entry.attempt;
    entry.attempt = {
      id: crypto.randomUUID(),
      caseId: entry.context.caseId,
      variant: entry.context.variant ?? null,
      ...(telegramWorks.via ? { via: telegramWorks.via } : {}),
      contact: replyTo,
      details: brief,
    };
    return entry.attempt;
  }

  async function deliver(entry, attempt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 16000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt),
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
      });
      if (response.status === 429) {
        entry.error = "Подождите минуту и попробуйте снова. Текст сохранился.";
        return;
      }
      if (response.status === 202) {
        entry.error = "Подтверждение пока не пришло. Нажмите «Отправить заявку» ещё раз, чтобы проверить доставку.";
        return;
      }
      const receipt = await response.json();
      const expected = attempt.id.slice(0, 13).toUpperCase();
      if (!response.ok || receipt.ok !== true || receipt.reference !== expected) throw new Error();
      entry.reference = receipt.reference;
    } catch {
      entry.error = "Подтверждение не пришло. Текст сохранился. Можно повторить отправку или написать мне в Telegram.";
    } finally {
      clearTimeout(timeout);
      entry.sending = false;
      if (active === entry && dialog.open) {
        renderStatus();
        if (entry.reference) byId("inquiry-success").focus();
      }
    }
  }

  for (const field of [contact, details]) {
    field.addEventListener("input", () => {
      active[field.name] = field.value;
      active.error = "";
      setFieldError(field, "");
      updateCount();
      renderStatus();
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (active.sending || active.reference) return;
    const contactError = contact.value.trim().length < 3 ? "Оставьте контакт для ответа." : "";
    const detailsError = details.value.trim() ? "" : "Коротко опишите задачу.";
    setFieldError(contact, contactError);
    setFieldError(details, detailsError);
    if (contactError || detailsError) {
      (contactError ? contact : details).focus();
      return;
    }
    active.contact = contact.value;
    active.details = details.value;
    active.error = "";
    active.sending = true;
    const attempt = getAttempt(active);
    renderStatus();
    void deliver(active, attempt);
  });

  openButton.addEventListener("click", open);
  byId("inquiry-close").addEventListener("click", () => dialog.close());
  byId("inquiry-done").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    telegramWorks.setDialog(false);
    if (active.reference) drafts.delete(active.key);
  });

  return { place };
})();
