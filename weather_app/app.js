const STORAGE_KEY = "weather-brief-settings";
const SCHEDULER_INTERVAL_MS = 1 * 60 * 1000;
const REVERSE_GEOCODE_DISTANCE_THRESHOLD = 0.003;
const CURRENT_POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};
const {
  KOREAN_LOCATION_ALIASES,
  REGION_ALIASES,
  DEFAULT_SETTINGS,
  WEATHER_CODES,
} = window.WEATHER_APP_CONSTANTS;

// 화면 갱신에 사용하는 주요 DOM 요소를 한곳에서 관리한다.
const elements = {
  searchForm: document.querySelector("#search-form"),
  cityInput: document.querySelector("#city-input"),
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
};

let schedulerId = null;

// localStorage에 저장된 사용자 설정을 불러오고, 없으면 기본값으로 시작한다.
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

// 사용자에게 현재 진행 상황이나 오류를 짧게 안내한다.
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

// 브리핑 알림의 중복 발송을 막기 위해 오늘 날짜 키를 만든다.
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueParts(parts) {
  return parts.filter((part, index) => part && parts.indexOf(part) === index);
}

function buildSearchResultLabel(displayName, admin1, country) {
  return uniqueParts([displayName, admin1, country]).join(" ");
}

// 한국어 지역 입력은 상위 도시/광역시 이름으로 정규화해서 검색 성공률을 높인다.
function normalizeSearchKeyword(keyword) {
  const trimmed = keyword.trim();
  if (KOREAN_LOCATION_ALIASES[trimmed]) {
    return KOREAN_LOCATION_ALIASES[trimmed];
  }

  const parts = trimmed
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const region = REGION_ALIASES[parts[0]];
    if (region) {
      return region;
    }
  }

  return trimmed;
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

// 7일 예보 카드를 템플릿 기반으로 다시 그린다.
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

// 첫 번째 예보 데이터를 기준으로 오늘의 요약 카드와 인사이트를 갱신한다.
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

// 현재 선택 지역, 마지막 업데이트 시간, 브리핑 상태를 헤더에 반영한다.
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

// 외부 API가 완전히 실패했을 때 화면을 비우지 않기 위한 예시 예보 데이터다.
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

// 도시 검색어를 좌표로 변환한다.
async function fetchCoordinatesByCity(city, displayName = city) {
  const normalizedCity = normalizeSearchKeyword(city);
  const params = new URLSearchParams({
    name: normalizedCity,
    count: "1",
    language: "ko",
    format: "json",
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding request failed with ${response.status}`);
  }

  const data = await response.json();
  const result = data.results?.[0];

  if (!result) {
    throw new Error("검색 결과가 없습니다.");
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    label: buildSearchResultLabel(displayName, result.admin1, result.country),
    city: normalizedCity,
    searchDisplayName: displayName,
  };
}

// 위도/경도 기준으로 7일 예보를 가져온다.
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

// 현재 위치를 사람에게 보여줄 지역명으로 바꾸기 위해 역지오코딩을 호출한다.
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

  return city;
}

// 브라우저 위치 권한을 요청하고 현재 좌표를 받아온다.
function getCurrentPosition(options = CURRENT_POSITION_OPTIONS) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Location permission denied")),
      options,
    );
  });
}

// 좌표 변화가 작으면 역지오코딩을 반복 호출하지 않도록 임계값으로 비교한다.
function hasMovedMeaningfully(latitude, longitude) {
  if (state.settings.lastResolvedLatitude == null || state.settings.lastResolvedLongitude == null) {
    return true;
  }

  const latDiff = Math.abs(latitude - state.settings.lastResolvedLatitude);
  const lonDiff = Math.abs(longitude - state.settings.lastResolvedLongitude);
  return latDiff >= REVERSE_GEOCODE_DISTANCE_THRESHOLD || lonDiff >= REVERSE_GEOCODE_DISTANCE_THRESHOLD;
}

// 현재 위치의 표시용 지역명을 갱신하고, 실패하면 좌표 문자열로 대체한다.
async function updateLocationLabelFromCoordinates(latitude, longitude, options = {}) {
  const { force = false } = options;

  if (!force && !hasMovedMeaningfully(latitude, longitude) && state.settings.label) {
    return;
  }

  try {
    const label = await fetchNearbyCityName(latitude, longitude);
    state.settings.label = label;
    state.settings.city = label;
    state.settings.searchDisplayName = label;
    state.settings.lastResolvedLatitude = latitude;
    state.settings.lastResolvedLongitude = longitude;
  } catch (error) {
    console.error(error);
    state.settings.label = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    state.settings.city = state.settings.label;
    state.settings.searchDisplayName = state.settings.label;
    state.settings.lastResolvedLatitude = latitude;
    state.settings.lastResolvedLongitude = longitude;
  }
}

// 예보 조회 실패 시 마지막 성공 데이터 유지 또는 fallback 표시를 담당한다.
function handleForecastFailure(message) {
  if (!state.forecast.length) {
    state.forecast = createFallbackForecast(state.settings.label);
    renderAll();
    setStatus(message, true);
    return;
  }

  renderAll();
  setStatus(`${message} 마지막 성공 데이터를 유지합니다.`, true);
}

// 검색 지역 또는 저장된 좌표 기준으로 예보를 불러온다.
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
      const location = await fetchCoordinatesByCity(
        state.settings.city,
        state.settings.searchDisplayName || state.settings.city,
      );
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
    handleForecastFailure("실시간 예보를 불러오지 못했습니다.");
  }
}

function stopScheduler() {
  if (schedulerId != null) {
    window.clearInterval(schedulerId);
    schedulerId = null;
  }
}

// 위치 기반 자동 갱신을 더 이상 진행할 수 없을 때 스케줄러를 안전하게 끈다.
function disableScheduler(message) {
  stopScheduler();
  state.settings.autoScheduler = "off";
  saveSettings();
  renderMeta();
  setStatus(message, true);
}

// 현재 위치를 다시 읽고, 그 좌표 기준 예보와 지역명을 함께 갱신한다.
async function loadForecastForCurrentLocation(options = {}) {
  const {
    silent = false,
    schedulerRun = false,
    disableSchedulerOnFailure = false,
    forceLabelRefresh = false,
  } = options;

  if (!silent) {
    setStatus(
      schedulerRun
        ? "자동 스케줄러가 현재 위치 날씨를 갱신하는 중입니다."
        : "현재 위치를 확인하는 중입니다.",
    );
  }

  try {
    const coords = await getCurrentPosition();
    state.settings.latitude = coords.latitude;
    state.settings.longitude = coords.longitude;
    state.settings.useCurrentLocation = true;
    await updateLocationLabelFromCoordinates(coords.latitude, coords.longitude, {
      force: forceLabelRefresh,
    });
    saveSettings();

    state.forecast = await fetchForecastByCoordinates(coords.latitude, coords.longitude);
    renderAll();
    setStatus(
      schedulerRun
        ? `자동 스케줄러가 ${state.settings.label} 기준 예보를 갱신했습니다.`
        : `${state.settings.label} 기준으로 예보를 업데이트했습니다.`,
    );
    maybeSendMorningNotification();
    return true;
  } catch (error) {
    console.error(error);
    handleForecastFailure("현재 위치 날씨를 불러오지 못했습니다.");

    if (disableSchedulerOnFailure && state.settings.autoScheduler === "on") {
      disableScheduler("현재 위치를 확인할 수 없어 자동 스케줄러를 껐습니다.");
    }

    return false;
  }
}

// 자동 스케줄러는 한 개의 interval만 유지하면서 주기적으로 현재 위치를 갱신한다.
function startScheduler() {
  stopScheduler();
  schedulerId = window.setInterval(() => {
    loadForecastForCurrentLocation({
      silent: true,
      schedulerRun: true,
      disableSchedulerOnFailure: true,
    });
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

// 현재 상태값을 기준으로 화면 전체를 다시 렌더링한다.
function renderAll() {
  hydrateControls();
  renderMeta();
  renderSummary(state.forecast);
  renderForecast(state.forecast);
}

// 브라우저 알림 권한을 요청하고, 허용되면 즉시 브리핑 테스트를 보낼 수 있다.
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

// 같은 날짜에는 한 번만 아침 브리핑 알림을 보내도록 제한한다.
function maybeSendMorningNotification(force = false) {
  if (state.settings.notifications !== "on") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const [hours, minutes] = state.settings.briefingTime.split(":").map(Number);
  const isTargetTime = now.getHours() === hours && Math.abs(now.getMinutes() - minutes) <= 10;

  if (!force && !isTargetTime) return;

  const todayKey = getTodayKey();
  if (!force && state.settings.lastNotificationDate === todayKey) return;

  const today = state.forecast[0];
  if (!today) return;

  const meta = getWeatherMeta(today.weatherCode);
  const body = `${state.settings.label}: ${meta.label}, ${Math.round(today.temperatureMax)}° / ${Math.round(today.temperatureMin)}°, 강수 확률 ${today.precipitationProbability}%`;

  new Notification("오늘의 아침 날씨 브리핑", { body });
  state.settings.lastNotificationDate = todayKey;
  saveSettings();
}

// 검색, 새로고침, 현재 위치, 알림, 자동 스케줄러 관련 사용자 이벤트를 연결한다.
function bindEvents() {
  elements.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const city = elements.cityInput.value.trim();

    if (!city) {
      setStatus("검색할 도시명을 입력하세요.", true);
      return;
    }

    const normalizedCity = normalizeSearchKeyword(city);

    state.settings.city = normalizedCity;
    state.settings.label = city;
    state.settings.searchDisplayName = city;
    state.settings.latitude = null;
    state.settings.longitude = null;
    state.settings.useCurrentLocation = false;
    saveSettings();
    await loadForecast({ silent: true, useStoredCoordinates: false });
  });

  elements.refreshButton.addEventListener("click", async () => {
    if (state.settings.useCurrentLocation) {
      await loadForecastForCurrentLocation({ forceLabelRefresh: true });
      return;
    }

    await loadForecast();
  });

  elements.locationButton.addEventListener("click", async () => {
    await loadForecastForCurrentLocation({ forceLabelRefresh: true });
  });

  elements.notificationButton.addEventListener("click", async () => {
    await requestNotificationPermission();
  });

  elements.schedulerButton.addEventListener("click", async () => {
    if (state.settings.autoScheduler === "on") {
      state.settings.autoScheduler = "off";
      saveSettings();
      applySchedulerState();
      setStatus("자동 스케줄러를 껐습니다.");
      return;
    }

    const loaded = await loadForecastForCurrentLocation({
      schedulerRun: true,
      disableSchedulerOnFailure: false,
      forceLabelRefresh: true,
    });

    if (!loaded) {
      disableScheduler("현재 위치를 확인할 수 없어 자동 스케줄러를 켜지 않았습니다.");
      return;
    }

    state.settings.autoScheduler = "on";
    saveSettings();
    applySchedulerState();
    setStatus("자동 스케줄러를 켰습니다. 1분마다 현재 위치 날씨를 갱신합니다.");
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

// 초기 진입 시 저장된 설정을 복원하고, 조건에 따라 첫 예보를 조회한다.
async function init() {
  bindEvents();
  hydrateControls();
  applySchedulerState();

  if (state.settings.autoScheduler === "on" || state.settings.useCurrentLocation) {
    const loaded = await loadForecastForCurrentLocation({
      silent: true,
      disableSchedulerOnFailure: state.settings.autoScheduler === "on",
    });

    if (loaded) {
      return;
    }
  }

  await loadForecast({ silent: true });
}

init();
