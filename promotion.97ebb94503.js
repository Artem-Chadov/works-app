const promotions = (() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const creatives = {
    sale: {
      label: "К продаже",
      title: "Подготовь салон к продаже",
      text: "Почистим сиденья, коврики и пластик.",
      clicks: 46,
      spend: 1400,
      leads: 2,
    },
    trips: {
      label: "После поездок",
      title: "Убери следы поездок",
      text: "Пыль, песок и следы на сиденьях после поездок.",
      clicks: 34,
      spend: 1000,
      leads: 0,
    },
  };
  const campaigns = {
    direct: {
      label: "Яндекс Директ",
      rows: [{ clicks: 60, spend: 3000, leads: 3 }],
    },
    target: {
      label: "Таргет",
      rows: Object.values(creatives),
    },
    maps: {
      label: "Яндекс Карты",
      rows: [{ clicks: 36, spend: 1200, leads: 3 }],
    },
  };

  const creativeButtons = [...document.querySelectorAll("[data-creative]")];
  const reportButtons = [...document.querySelectorAll("[data-report-filter]")];
  const formatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  let currentCreative = creatives.sale;
  let currentPass = null;

  function sum(rows) {
    const totals = { clicks: 0, spend: 0, leads: 0 };
    for (const row of rows) {
      totals.clicks += row.clicks;
      totals.spend += row.spend;
      totals.leads += row.leads;
    }
    return totals;
  }

  function number(value) {
    return formatter.format(value).replace(/\u202f/g, " ");
  }

  function money(value) {
    return `${number(value)} ₽`;
  }

  function costPerLead(row) {
    return row.leads ? money(row.spend / row.leads) : "Нет заявок";
  }

  function renderCreative(button) {
    currentCreative = creatives[button.dataset.creative];
    for (const option of creativeButtons) {
      option.setAttribute("aria-pressed", String(option === button));
    }
    byId("creative-title").textContent = currentCreative.title;
    byId("creative-text").textContent = currentCreative.text;
  }

  for (const button of creativeButtons) {
    button.addEventListener("click", () => renderCreative(button));
  }
  renderCreative(creativeButtons[0]);

  function renderBreakdown(filter) {
    const breakdown = byId("report-breakdown");
    const byChannel = filter === "all";
    const visible = byChannel || filter === "target";
    breakdown.hidden = !visible;
    if (!visible) return;

    byId("report-breakdown-title").textContent = byChannel ? "По каналам" : "По объявлениям";
    byId("report-group-label").textContent = byChannel ? "Канал" : "Объявление";
    const rows = byChannel
      ? Object.values(campaigns).map((campaign) => ({ label: campaign.label, ...sum(campaign.rows) }))
      : campaigns.target.rows;

    const rendered = rows.map((item) => {
      const row = document.createElement("tr");
      const title = document.createElement("th");
      const clicks = document.createElement("td");
      const price = document.createElement("td");
      title.scope = "row";
      title.textContent = item.label;
      clicks.textContent = number(item.clicks);
      price.textContent = costPerLead(item);
      row.append(title, clicks, price);
      return row;
    });
    byId("report-rows").replaceChildren(...rendered);
  }

  function renderPass(filter) {
    const pass = byId("report-session");
    const visible = currentPass && (filter === "all" || filter === currentPass.source);
    pass.hidden = !visible;
    if (!visible) return;

    const label = campaigns[currentPass.source].label;
    byId("report-session-source").textContent = currentPass.creative
      ? `${label} · ${currentPass.creative}`
      : label;
    byId("report-session-ticket").textContent = `Клик по примеру → тестовая заявка № ${currentPass.number}`;
  }

  function renderReport(filter) {
    const rows = filter === "all"
      ? Object.values(campaigns).flatMap((campaign) => campaign.rows)
      : campaigns[filter].rows;
    const totals = sum(rows);
    const cost = costPerLead(totals);
    for (const button of reportButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.reportFilter === filter));
    }

    byId("report-clicks").textContent = number(totals.clicks);
    byId("report-spend").textContent = money(totals.spend);
    byId("report-leads").textContent = number(totals.leads);
    byId("report-cpl").textContent = cost;
    const calculation = byId("report-calculation");
    calculation.textContent = cost;
    if (totals.leads) {
      const sign = totals.spend % totals.leads === 0 ? "=" : "≈";
      calculation.textContent = `${money(totals.spend)} ÷ ${number(totals.leads)} ${sign} ${cost}`;
    }
    byId("report-note").hidden = filter !== "all" && filter !== "maps";
    renderBreakdown(filter);
    renderPass(filter);
  }

  for (const button of reportButtons) {
    button.addEventListener("click", () => renderReport(button.dataset.reportFilter));
  }

  return {
    hasChannel: (value) => Object.hasOwn(campaigns, value),
    creativeLabel: () => currentCreative.label,
    showReport(filter, pass) {
      currentPass = pass;
      renderReport(filter);
    },
  };
})();
