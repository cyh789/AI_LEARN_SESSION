const STORAGE_KEY = "weather-brief-settings";
const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_SETTINGS = {
  city: "Seoul",
  label: "서울",
  latitude: null,
  longitude: null,
  briefingTime: "07:30",
  notifications: "on",
  autoScheduler: "off",
  useCurrentLocation: false,
};

const WEATHER_CODES = {
  0: { label: "맑음", icon: "☀️" },
  1: { label: "대체로 맑음", icon: "🌤️" },
  2: { label: "부분적으로 흐림", icon: "⛅" },
  3: { label: "흐림", icon: "☁️" },
  45: { label: "안개", icon: "🌫️" },
  48: { label: "서리 안개", icon: "🌫️" },
  51: { label: "약한 이슬비", icon: "🌦️" },
  53: { label: "이슬비", icon: "🌦️" },
  55: { label: "강한 이슬비", icon: "🌧️" },
  61: { label: "약한 비", icon: "🌦️" },
  63: { label: "비", icon: "🌧️" },
  65: { label: "강한 비", icon: "🌧️" },
  71: { label: "약한 눈", icon: "🌨️" },
  73: { label: "눈", icon: "🌨️" },
  75: { label: "강한 눈", icon: "❄️" },
  80: { label: "소나기", icon: "🌦️" },
  81: { label: "강한 소나기", icon: "🌧️" },
  82: { label: "매우 강한 소나기", icon: "⛈️" },
  95: { label: "뇌우", icon: "⛈️" },
  96: { label: "우박 동반 뇌우", icon: "⛈️" },
  99: { label: "강한 우박 동반 뇌우", icon: "⛈️" },
};

const elements = {
  searchForm: document.querySelector("#search-form"),
  cityInput: document.querySelector("#city-input"),
  searchResults: document.querySelector("#search-results"),
  briefingTime: document.querySelector("#briefing-time"),
  notificationToggle: document.querySelector("#notification-toggle"),
  schedulerButton: document.querySelector("#scheduler-button"),
  refreshButton: document.querySelector("#refresh-button"),
  locationButton: document.querySelector("#location-button"),
  notificationButton: document.querySelector("#notification-button"),
  statusMessage: document.querySelector("#status-message"),
  currentLocation: document.querySelector("#current-location"),
  lastUpdated: document.querySelector("#last-updated"),
  briefingStatus: document.querySelector("#briefing-status"),
  summaryDate: document.querySelector("#summary-date"),
  summaryBadge: document.querySelector("#summary-badge"),
  summaryIcon: document.querySelector("#summary-icon"),
  summaryCondition: document.querySelector("#summary-condition"),
  summaryTemp: document.querySelector("#summary-temp"),
  summaryAdvice: document.querySelector("#summary-advice"),
  rainChance: document.querySelector("#rain-chance"),
  umbrellaNeed: document.querySelector("#umbrella-need"),
  clothingTip: document.querySelector("#clothing-tip"),
  insightList: document.querySelector("#insight-list"),
  forecastGrid: document.querySelector("#forecast-grid"),
  forecastTemplate: document.querySelector("#forecast-card-template"),
};

let state = {
  settings: loadSettings(),
  forecast: [],
  searchCandidates: [],
};

let schedulerId = null;

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    console.error("Failed to load settings", error);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? "#a63f3f" : "";
}

function formatDateLabel(dateString, options) {
  return new Intl.DateTimeFormat("ko-KR", options).format(new Date(dateString));
}

function formatTimeLabel(value) {
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getWeatherMeta(code) {
  return WEATHER_CODES[code] || { label: "날씨 정보", icon: "🌤️" };
}

function getClothingTip(maxTemp, minTemp) {
  const average = (maxTemp + minTemp) / 2;

  if (average >= 27) return "반팔, 얇은 셔츠";
  if (average >= 20) return "가벼운 긴팔";
  if (average >= 12) return "자켓 또는 가디건";
  if (average >= 5) return "코트 또는 니트";
  return "두꺼운 외투";
}

function getAdvice(day) {
  if (day.precipitationProbability >= 60) {
    return "비 가능성이 높습니다. 우산을 챙기는 편이 안전합니다.";
  }

  if (day.weatherCode >= 71 && day.weatherCode <= 75) {
    return "눈 예보가 있습니다. 이동 시간을 여유 있게 잡는 편이 좋습니다.";
  }

  if (day.temperatureMax >= 30) {
    return "낮 기온이 높습니다. 수분 보충과 가벼운 옷차림을 권장합니다.";
  }

  if (day.temperatureMin <= 0) {
    return "아침 기온이 낮습니다. 외투와 보온용품을 준비하세요.";
  }

  return "큰 날씨 변수는 적지만 일교차를 확인하고 옷차림을 준비하세요.";
}

function getSummaryBadge(day) {
  if (day.precipitationProbability >= 60) return "우산 준비";
  if (day.temperatureMax >= 30) return "더위 주의";
  if (day.temperatureMin <= 0) return "추위 대비";
  return "안정적";
}

function buildInsights(days) {
  if (!days.length) {
    return [];
  }

  const hottestDay = days.reduce((max, day) => day.temperatureMax > max.temperatureMax ? day : max, days[0]);
  const coldestDay = days.reduce((min, day) => day.temperatureMin < min.temperatureMin ? day : min, days[0]);
  const wettestDay = days.reduce((max, day) => day.precipitationProbability > max.precipitationProbability ? day : max, days[0]);

  const insights = [
    `가장 더운 날은 ${formatDateLabel(hottestDay.date, { weekday: "long" })}이며 최고 ${Math.round(hottestDay.temperatureMax)}°C입니다.`,
    `가장 추운 날은 ${formatDateLabel(coldestDay.date, { weekday: "long" })}이며 최저 ${Math.round(coldestDay.temperatureMin)}°C입니다.`,
  ];

  if (wettestDay.precipitationProbability >= 40) {
    insights.push(
      `${formatDateLabel(wettestDay.date, { weekday: "long" })}의 강수 확률이 ${wettestDay.precipitationProbability}%로 가장 높습니다.`,
    );
  } else {
    insights.push("이번 주는 전반적으로 강수 가능성이 낮은 편입니다.");
  }

  return insights;
}

function renderForecast(days) {
  elements.forecastGrid.innerHTML = "";

  days.forEach((day) => {
    const meta = getWeatherMeta(day.weatherCode);
    const card = elements.forecastTemplate.content.firstElementChild.cloneNode(true);

    card.querySelector(".forecast-day").textContent = formatDateLabel(day.date, { weekday: "short" });
    card.querySelector(".forecast-date").textContent = formatDateLabel(day.date, { month: "numeric", day: "numeric" });
    card.querySelector(".forecast-icon").textContent = meta.icon;
    card.querySelector(".forecast-condition").textContent = meta.label;
    card.querySelector(".forecast-temp").textContent = `${Math.round(day.temperatureMax)}° / ${Math.round(day.temperatureMin)}°`;
    card.querySelector(".forecast-rain").textContent = `강수 확률 ${day.precipitationProbability}%`;

    elements.forecastGrid.appendChild(card);
  });
}

function renderSummary(days) {
  if (!days.length) {
    return;
  }

  const today = days[0];
  const meta = getWeatherMeta(today.weatherCode);

  elements.summaryDate.textContent = formatDateLabel(today.date, {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  elements.summaryBadge.textContent = getSummaryBadge(today);
  elements.summaryIcon.textContent = meta.icon;
  elements.summaryCondition.textContent = meta.label;
  elements.summaryTemp.textContent = `${Math.round(today.temperatureMax)}° / ${Math.round(today.temperatureMin)}°`;
  elements.summaryAdvice.textContent = getAdvice(today);
  elements.rainChance.textContent = `${today.precipitationProbability}%`;
  elements.umbrellaNeed.textContent = today.precipitationProbability >= 50 ? "권장" : "선택";
  elements.clothingTip.textContent = getClothingTip(today.temperatureMax, today.temperatureMin);
  elements.insightList.innerHTML = buildInsights(days).map((item) => `<li>${item}</li>`).join("");
}

function syncSchedulerButton() {
  const isOn = state.settings.autoScheduler === "on";
  elements.schedulerButton.textContent = isOn ? "ON" : "OFF";
  elements.schedulerButton.setAttribute("aria-pressed", String(isOn));
  elements.schedulerButton.classList.toggle("is-on", isOn);
}

function renderMeta() {
  elements.currentLocation.textContent = state.settings.label;
  elements.briefingStatus.textContent = state.settings.notifications === "on"
    ? `매일 ${formatTimeLabel(state.settings.briefingTime)}`
    : "사용 안 함";
  elements.lastUpdated.textContent = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
  syncSchedulerButton();
}

function hydrateControls() {
  elements.cityInput.value = state.settings.city || "";
  elements.briefingTime.value = state.settings.briefingTime;
  elements.notificationToggle.value = state.settings.notifications;
  syncSchedulerButton();
}

function createFallbackForecast(label) {
  const baseDate = new Date();
  const seed = label.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + index);
    const max = 12 + ((seed + index * 3) % 17);
    const min = max - (5 + (index % 4));
    const precipitationProbability = (seed + index * 17) % 75;
    const weatherCandidates = [0, 1, 2, 3, 61, 63, 80];
    const weatherCode = weatherCandidates[(seed + index) % weatherCandidates.length];

    return {
      date: date.toISOString().slice(0, 10),
      temperatureMax: max,
      temperatureMin: min,
      precipitationProbability,
      weatherCode,
    };
  });
}

function normalizeForecast(daily) {
  return daily.time.map((date, index) => ({
    date,
    weatherCode: daily.weather_code[index],
    temperatureMax: daily.temperature_2m_max[index],
    temperatureMin: daily.temperature_2m_min[index],
    precipitationProbability: daily.precipitation_probability_max[index] ?? 0,
  }));
}

async function fetchCoordinatesByCity(city) {
  const results = await fetchLocationCandidates(city, 1);
  const result = results[0];

  if (!result) {
    throw new Error("검색 결과가 없습니다.");
  }

  return result;
}

async function fetchLocationCandidates(city, count = 5) {
  const params = new URLSearchParams({
    name: city,
    count: String(count),
    language: "ko",
    format: "json",
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding request failed with ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map((result) => ({
    latitude: result.latitude,
    longitude: result.longitude,
    label: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
    city: result.name,
    country: result.country || "",
    admin1: result.admin1 || "",
  }));
}

async function fetchForecastByCoordinates(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Forecast request failed with ${response.status}`);
  }

  const data = await response.json();
  return normalizeForecast(data.daily);
}

async function fetchNearbyCityName(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "ko",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with ${response.status}`);
  }

  const data = await response.json();
  const address = data.address || {};
  const district =
    address.borough ||
    address.suburb ||
    address.city_district ||
    address.quarter ||
    address.neighbourhood;
  const city =
    district ||
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    data.name;

  if (!city) {
    throw new Error("Nearby city not found");
  }

  const country = address.country || "";
  return [city, country].filter(Boolean).join(", ");
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Location permission denied")),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}

async function updateLocationLabelFromCoordinates(latitude, longitude) {
  try {
    const label = await fetchNearbyCityName(latitude, longitude);
    state.settings.label = label;
    state.settings.city = label;
  } catch (error) {
    console.error(error);
    state.settings.label = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    state.settings.city = state.settings.label;
  }
}

async function loadForecast(options = {}) {
  const { silent = false, useStoredCoordinates = true } = options;

  if (!silent) {
    setStatus("날씨 정보를 불러오는 중입니다.");
  }

  try {
    let forecast;

    if (useStoredCoordinates && state.settings.latitude != null && state.settings.longitude != null) {
      forecast = await fetchForecastByCoordinates(state.settings.latitude, state.settings.longitude);
    } else {
      const location = await fetchCoordinatesByCity(state.settings.city);
      state.settings = {
        ...state.settings,
        ...location,
        useCurrentLocation: false,
      };
      saveSettings();
      forecast = await fetchForecastByCoordinates(location.latitude, location.longitude);
    }

    state.forecast = forecast;
    renderAll();
    setStatus("최신 예보를 반영했습니다.");
    maybeSendMorningNotification();
  } catch (error) {
    console.error(error);
    state.forecast = createFallbackForecast(state.settings.label);
    renderAll();
    setStatus("실시간 예보를 불러오지 못해 예시 데이터를 표시했습니다.", true);
  }
}

async function loadForecastForCurrentLocation(options = {}) {
  const { silent = false, schedulerRun = false } = options;

  if (!silent) {
    setStatus(schedulerRun ? "자동 스케줄러가 현재 위치 날씨를 갱신하는 중입니다." : "현재 위치를 확인하는 중입니다.");
  }

  try {
    const coords = await getCurrentPosition();
    state.settings.latitude = coords.latitude;
    state.settings.longitude = coords.longitude;
    state.settings.useCurrentLocation = true;
    await updateLocationLabelFromCoordinates(coords.latitude, coords.longitude);
    saveSettings();

    state.forecast = await fetchForecastByCoordinates(coords.latitude, coords.longitude);
    renderAll();
    setStatus(
      schedulerRun
        ? `자동 스케줄러가 ${state.settings.label} 기준 예보를 갱신했습니다.`
        : `${state.settings.label} 기준으로 예보를 업데이트했습니다.`,
    );
    maybeSendMorningNotification();
  } catch (error) {
    console.error(error);
    if (!state.forecast.length) {
      state.forecast = createFallbackForecast(state.settings.label);
      renderAll();
    }
    setStatus("현재 위치를 가져오지 못했습니다. 도시 검색을 사용하세요.", true);
  }
}

function stopScheduler() {
  if (schedulerId != null) {
    window.clearInterval(schedulerId);
    schedulerId = null;
  }
}

function clearSearchResults(message = "검색 가능한 도시 후보가 여기 표시됩니다.") {
  state.searchCandidates = [];
  elements.searchResults.innerHTML = `<p class="search-result-empty">${message}</p>`;
}

function renderSearchResults(candidates) {
  state.searchCandidates = candidates;

  if (!candidates.length) {
    clearSearchResults("검색 결과가 없습니다. 영어 도시명으로 다시 시도해보세요.");
    return;
  }

  elements.searchResults.innerHTML = candidates
    .map(
      (candidate, index) => `
        <button class="search-result-button" type="button" data-index="${index}">
          <span class="search-result-title">${candidate.city}</span>
          <span class="search-result-meta">${candidate.label}</span>
        </button>
      `,
    )
    .join("");
}

async function applyLocationSelection(location) {
  state.settings.city = location.city;
  state.settings.label = location.label;
  state.settings.latitude = location.latitude;
  state.settings.longitude = location.longitude;
  state.settings.useCurrentLocation = false;
  saveSettings();
  await loadForecast({ silent: true, useStoredCoordinates: true });
}

function startScheduler() {
  stopScheduler();
  schedulerId = window.setInterval(() => {
    loadForecastForCurrentLocation({ silent: true, schedulerRun: true });
  }, SCHEDULER_INTERVAL_MS);
}

function applySchedulerState() {
  if (state.settings.autoScheduler === "on") {
    startScheduler();
  } else {
    stopScheduler();
  }
  syncSchedulerButton();
}

function renderAll() {
  hydrateControls();
  renderMeta();
  renderSummary(state.forecast);
  renderForecast(state.forecast);
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    setStatus("이 브라우저는 알림을 지원하지 않습니다.", true);
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    setStatus("브라우저 알림 권한이 허용되었습니다.");
    maybeSendMorningNotification(true);
    return;
  }

  setStatus("알림 권한이 허용되지 않았습니다.", true);
}

function maybeSendMorningNotification(force = false) {
  if (state.settings.notifications !== "on") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const [hours, minutes] = state.settings.briefingTime.split(":").map(Number);
  const isTargetTime = now.getHours() === hours && Math.abs(now.getMinutes() - minutes) <= 10;

  if (!force && !isTargetTime) return;

  const today = state.forecast[0];
  if (!today) return;

  const meta = getWeatherMeta(today.weatherCode);
  const body = `${state.settings.label}: ${meta.label}, ${Math.round(today.temperatureMax)}° / ${Math.round(today.temperatureMin)}°, 강수 확률 ${today.precipitationProbability}%`;
  new Notification("오늘의 아침 날씨 브리핑", { body });
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const city = elements.cityInput.value.trim();

    if (!city) {
      setStatus("검색할 도시명을 입력하세요.", true);
      return;
    }

    try {
      setStatus("검색 가능한 도시 후보를 찾는 중입니다.");
      const candidates = await fetchLocationCandidates(city, 5);
      renderSearchResults(candidates);

      if (!candidates.length) {
        setStatus("검색 결과가 없습니다. 영어 도시명으로 다시 시도해보세요.", true);
        return;
      }

      if (candidates.length === 1) {
        await applyLocationSelection(candidates[0]);
        setStatus(`${candidates[0].label}을(를) 선택해 예보를 불러왔습니다.`);
        return;
      }

      setStatus("검색 결과가 여러 개입니다. 아래 후보 중 하나를 선택하세요.");
    } catch (error) {
      console.error(error);
      clearSearchResults("도시 후보를 불러오지 못했습니다.");
      setStatus("도시 후보를 불러오지 못했습니다.", true);
    }
  });

  elements.searchResults.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) {
      return;
    }

    const location = state.searchCandidates[Number(button.dataset.index)];
    if (!location) {
      return;
    }

    await applyLocationSelection(location);
    setStatus(`${location.label}을(를) 선택해 예보를 불러왔습니다.`);
  });

  elements.refreshButton.addEventListener("click", async () => {
    if (state.settings.useCurrentLocation) {
      await loadForecastForCurrentLocation();
      return;
    }

    await loadForecast();
  });

  elements.locationButton.addEventListener("click", async () => {
    await loadForecastForCurrentLocation();
  });

  elements.notificationButton.addEventListener("click", async () => {
    await requestNotificationPermission();
  });

  elements.schedulerButton.addEventListener("click", async () => {
    state.settings.autoScheduler = state.settings.autoScheduler === "on" ? "off" : "on";
    saveSettings();
    applySchedulerState();

    if (state.settings.autoScheduler === "on") {
      await loadForecastForCurrentLocation({ schedulerRun: true });
      setStatus("자동 스케줄러를 켰습니다. 5분마다 현재 위치 날씨를 갱신합니다.");
    } else {
      setStatus("자동 스케줄러를 껐습니다.");
    }
  });

  elements.briefingTime.addEventListener("change", () => {
    state.settings.briefingTime = elements.briefingTime.value;
    saveSettings();
    renderMeta();
    setStatus(`아침 브리핑 시간을 ${formatTimeLabel(state.settings.briefingTime)}로 저장했습니다.`);
  });

  elements.notificationToggle.addEventListener("change", () => {
    state.settings.notifications = elements.notificationToggle.value;
    saveSettings();
    renderMeta();
    setStatus(
      state.settings.notifications === "on"
        ? "브리핑 알림을 사용하도록 저장했습니다."
        : "브리핑 알림을 끄도록 저장했습니다.",
    );
  });
}

async function init() {
  bindEvents();
  hydrateControls();
  applySchedulerState();
  clearSearchResults();

  if (state.settings.autoScheduler === "on" || state.settings.useCurrentLocation) {
    await loadForecastForCurrentLocation({ silent: true });
    return;
  }

  await loadForecast({ silent: true });
}

init();
