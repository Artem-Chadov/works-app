(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);

  function selectButton(buttons, selected) {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button === selected));
    }
  }

  function openPanel(trigger, panel, heading) {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    heading.focus();
    workMotion.play(panel, "screen");
  }

  function switchResult(form, result, showResult, focusTarget) {
    form.hidden = showResult;
    result.hidden = !showResult;
    focusTarget.focus();
    workMotion.play(showResult ? result : form, "screen");
  }

  const trips = {
    rockies: {
      name: "Скалистые горы",
      duration: "10 дней",
      image: "rockies.jpg",
      alt: "Озеро Морейн в Скалистых горах",
      description: "Из Калгари в Банф и Джаспер. По пути можно выйти к озеру Морейн и поплавать на каноэ.",
      days: [
        "Из Калгари в Банф. Подъём на гору Салфер.",
        "Рассвет у озера Морейн и прогулка к озеру Агнес.",
        "Каноэ на Эмеральд-Лейк и водопад Такакау.",
      ],
    },
    yukon: {
      name: "Юкон",
      duration: "7 дней",
      image: "yukon.jpg",
      alt: "Северное сияние над холмами Юкона",
      description: "Домик у озера, упряжки и горячие источники.",
      days: [
        "Встреча и первый выезд смотреть северное сияние.",
        "Питомник хаски и поездка на нартах по реке Такини.",
        "Отдых и горячие источники Такини.",
      ],
    },
    churchill: {
      name: "Черчилль",
      duration: "6 дней",
      image: "churchill.jpg",
      alt: "Каменный инуксук на заснеженном берегу",
      description: "Перелёт из Виннипега и поездки по тундре.",
      days: [
        "Виннипег и Музей прав человека.",
        "Перелёт в Черчилль и музей инуитского искусства.",
        "Поездка на вездеходе у мыса Черчилл.",
      ],
    },
  };
  const tripButtons = [...document.querySelectorAll("[data-trip]")];
  const tripPhoto = byId("trip-photo");

  function renderTrip(selected) {
    const trip = trips[selected.dataset.trip];
    selectButton(tripButtons, selected);
    byId("trip-duration").textContent = trip.duration;
    byId("trip-name").textContent = trip.name;
    byId("trip-description").textContent = trip.description;
    tripPhoto.src = `assets/${trip.image}`;
    tripPhoto.alt = trip.alt;
    const days = trip.days.map((text, index) => {
      const row = document.createElement("li");
      const day = document.createElement("span");
      const content = document.createElement("span");
      day.className = "meta";
      day.textContent = `День ${index + 1}`;
      content.textContent = text;
      row.append(day, content);
      return row;
    });
    byId("trip-itinerary").replaceChildren(...days);
  }

  for (const button of tripButtons) {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      renderTrip(button);
      workMotion.play(tripPhoto.closest(".work"));
    });
  }
  renderTrip(tripButtons[0]);

  const menus = {
    street: ["Бургер ПО", "Хот-дог с цыплёнком", "Хот-дог со рваной свининой"],
    salads: ["Салат с баклажанами и томатами", "Салат с ростбифом и огурцами ким-чи", "Цезарь с курицей"],
  };
  const menuButtons = [...document.querySelectorAll("[data-menu]")];

  function renderMenu(selected) {
    selectButton(menuButtons, selected);
    const dishes = menus[selected.dataset.menu].map((name) => {
      const row = document.createElement("li");
      row.textContent = name;
      return row;
    });
    byId("pablo-menu").replaceChildren(...dishes);
  }

  for (const button of menuButtons) {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      renderMenu(button);
      workMotion.play(byId("pablo-menu"));
    });
  }
  renderMenu(menuButtons[0]);

  const bookTable = byId("pablo-book");
  const tableForm = byId("pablo-form");
  const tableResult = byId("pablo-result");
  const dayField = tableForm.elements.day;
  const timeField = tableForm.elements.time;

  function renderTimes() {
    const busy = dayField.value === "fri" ? "19:30" : "21:00";
    const needsNewTime = timeField.value === busy;
    for (const option of timeField.options) {
      if (!option.value) continue;
      option.disabled = option.value === busy;
      option.textContent = option.disabled ? `${option.value} · занято` : option.value;
    }

    if (needsNewTime) timeField.value = "";
    byId("pablo-time-note").textContent = needsNewTime ? "Это время занято. Выберите другое." : "";
    byId("pablo-time-note").hidden = !needsNewTime;
  }

  dayField.addEventListener("change", renderTimes);
  renderTimes();

  bookTable.addEventListener("click", () => {
    openPanel(bookTable, byId("pablo-booking"), byId("pablo-booking-title"));
  });

  tableForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const time = timeField.selectedOptions[0];
    if (tableForm.hidden || !time?.value || time.disabled) return;

    byId("pablo-result-day").textContent = dayField.selectedOptions[0].textContent;
    byId("pablo-result-time").textContent = time.value;
    byId("pablo-result-guests").textContent = tableForm.elements.guests.selectedOptions[0].textContent;
    switchResult(tableForm, tableResult, true, byId("pablo-result-title"));
  });

  byId("pablo-edit").addEventListener("click", () => {
    switchResult(tableForm, tableResult, false, dayField);
  });

  const seoExamples = {
    move: {
      query: "«Перевозка аквариума с рыбами в Москве»",
      title: "Перевозка аквариумов с рыбами",
      description: "На странице видны порядок перевозки и данные для расчёта.",
      before: "У перевозки уже была отдельная страница с калькулятором.",
      after: "Добавил объяснение, как везут аквариум с рыбами и что нужно знать для расчёта.",
      service: "Перевозка аквариума",
      label: "Условия подъёма",
      options: ["Есть грузовой лифт", "Подъём по лестнице"],
    },
    care: {
      query: "«Обслуживание аквариумов в Москве»",
      title: "Обслуживание аквариумов",
      description: "На странице можно выбрать разовую чистку или уход по графику.",
      before: "Услуга открывалась в окне с главной страницы.",
      after: "Вынес обслуживание на отдельную страницу. У человека будет выбор между разовой чисткой и уходом по графику.",
      service: "Обслуживание аквариума",
      label: "Какая помощь нужна",
      options: ["Разовая чистка", "Регулярное обслуживание"],
    },
  };
  const seoButtons = [...document.querySelectorAll("[data-seo]")];
  const seoNext = byId("seo-next");
  const seoPanel = byId("seo-parameters");
  const seoForm = byId("seo-form");
  const seoResult = byId("seo-result");
  let selectedSeo = null;

  function renderSeo(selected) {
    if (selectedSeo === selected) return;
    selectedSeo = selected;
    const example = seoExamples[selected.dataset.seo];
    selectButton(seoButtons, selected);
    byId("seo-query").textContent = example.query;
    byId("seo-page-title").textContent = example.title;
    byId("seo-page-description").textContent = example.description;
    byId("seo-before").textContent = example.before;
    byId("seo-after").textContent = example.after;
    byId("seo-detail-label").textContent = example.label;
    seoForm.elements.detail.replaceChildren(...example.options.map((label) => new Option(label)));
    seoPanel.hidden = true;
    seoForm.hidden = false;
    seoResult.hidden = true;
    seoNext.setAttribute("aria-expanded", "false");
  }

  for (const button of seoButtons) {
    button.addEventListener("click", () => {
      if (selectedSeo === button) return;
      renderSeo(button);
      workMotion.play(byId("seo-query").parentElement);
      workMotion.play(seoNext.closest(".work"));
    });
  }
  renderSeo(seoButtons[0]);

  seoNext.addEventListener("click", () => {
    openPanel(seoNext, seoPanel, byId("seo-params-title"));
  });

  seoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (seoForm.hidden || seoPanel.hidden) return;

    const example = seoExamples[selectedSeo.dataset.seo];
    byId("seo-result-service").textContent = example.service;
    byId("seo-result-volume").textContent = seoForm.elements.volume.value;
    byId("seo-result-label").textContent = example.label;
    byId("seo-result-detail").textContent = seoForm.elements.detail.value;
    switchResult(seoForm, seoResult, true, byId("seo-result-title"));
  });

  byId("seo-edit").addEventListener("click", () => {
    switchResult(seoForm, seoResult, false, seoForm.elements.volume);
  });
})();
