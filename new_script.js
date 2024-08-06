let totalTime = parseInt(localStorage.getItem("totalTime")) || 0;
let startTime = parseInt(localStorage.getItem("startTime")) || Date.now();
let profileHistoryId = localStorage.getItem("history") || undefined;

let timerInterval;
let isPaused = false;
let isWindowActive = true;
let cursorLeftTime = null;

function saveToLocalStorage(data) {
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      localStorage.setItem(key, data[key]);
    }
  }
}

function bpConfig(websiteId) {
  const user = readCookie("bp_user");
  if (!user) {
    createUser(websiteId);
  } else {
    setupEventListeners(websiteId);
  }
}

function createCookie(cookieName, cookieValue) {
  try {
    return (document.cookie = `${cookieName}=${cookieValue}; expires=${getCookieExpirationDate()}; path=/`);
  } catch (error) {
    console.error(error);
  }
}

function readCookie(cookieName) {
  const name = `${cookieName}=`;
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i];

    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1);
    }

    if (cookie.indexOf(name) === 0) {
      const result = cookie.substring(name.length, cookie.length);

      createCookie(cookieName, result);

      return result;
    }
  }

  return "";
}

async function apiCall(endpoint, payload, method = "POST") {
  const BASE_URL = `http://127.0.0.1/api/cdn/v1/${endpoint}`;

  return fetch(BASE_URL, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json()) //
    .catch((error) => {
      throw error;
    });
}

function getQueryParam(param) {
  const queryString = window.location.search;
  if (queryString) {
    const params = new URLSearchParams(queryString);
    return params.get(param);
  }
  return null;
}

async function getPublicIpAddress() {
  try {
    const response = await fetch("https://api.ipify.org/?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("Error getting public IP address:", error);
    return null;
  }
}

async function createUser(websiteId) {
  if (websiteId === undefined) {
    throw new Error("Website ID is required");
  }

  const userIpAddress = await getPublicIpAddress();

  if (!userIpAddress) {
    console.error("Unable to retrieve user's IP address");
    return;
  }

  const campaign = getQueryParam("utm_campaign");
  const source = getQueryParam("utm_source");
  const payload = {
    platform: source,
    websiteId: websiteId,
    campaign: campaign ? campaign : null,
    ipAddress: userIpAddress,
  };

  try {
    const userData = await apiCall("profile", payload);
    createCookie("bp_user", userData.userId);
    const user = readCookie("bp_user");
    const userHistory = {
      userProfileId: user,
      pageUrl: window.location.href,
      pageTitle: document.title,
      websiteId: websiteId,
      ipAddress: userIpAddress,
    };
    try {
      const userprofileHistory = await apiCall("profile/history", userHistory);
      profileHistoryId = userprofileHistory?.userProfileHistory?.id;
      saveToLocalStorage({
        history: profileHistoryId,
      });
    } catch (error) {
      console.error("Error submitting user history:", error);
    }
  } catch (error) {
    console.error("Error creating user:", error);
  }
}

function getCookieExpirationDate() {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  return expirationDate.toUTCString();
}

async function onPageLoadOrURLChange(websiteId) {
  const user = readCookie("bp_user");
  await updateTimeSpent();
  const userHistory = {
    userProfileId: user,
    pageUrl: window.location.href,
    pageTitle: document.title,
    websiteId: websiteId,
  };

  try {
    const userprofileHistory = await apiCall("profile/history", userHistory);
    profileHistoryId = userprofileHistory?.userProfileHistory?.id;
    saveToLocalStorage({
      history: profileHistoryId,
    });
    startTimer();
  } catch (error) {
    console.error("Error submitting user history:", error);
  }
}

function setupEventListeners(websiteId) {
  let previousUrl = "";
  const observer = new MutationObserver(function (mutations) {
    if (location.href !== previousUrl) {
      previousUrl = location.href;
      onPageLoadOrURLChange(websiteId);
    }
  });
  const config = { subtree: true, childList: true };
  observer.observe(document, config);
}

document.addEventListener("visibilitychange", checkInactive);
window.addEventListener("focus", checkInactive);

checkInactive();

function startTimer() {
  startTime = Date.now() - totalTime;
  timerInterval = setInterval(updateTimer, 1000);

  function updateTimer() {
    if (!isPaused && isWindowActive) {
      totalTime = Date.now() - startTime;
      saveToLocalStorage({
        totalTime,
      });
    }
  }
}

document.addEventListener("mouseout", () => {
  if (!isPaused && isWindowActive) {
    cursorLeftTime = Date.now();
    isPaused = true;
  }
});

document.addEventListener("mouseover", () => {
  if (isPaused && isWindowActive) {
    const timePaused = Date.now() - cursorLeftTime;
    totalTime += timePaused;
    cursorLeftTime = null;
    isPaused = false;
  }
});

async function updateTimeSpent() {
  if (document.visibilityState === "hidden") {
    isWindowActive = false;
  } else {
    isWindowActive = true;
  }

  const endTime = Date.now();
  totalTime = endTime - startTime;
  if (profileHistoryId && profileHistoryId !== undefined && totalTime > 0) {
    const user = readCookie("bp_user");
    try {
      await apiCall(
        "profile/history",
        {
          timeSpent: totalTime,
          userProfileId: user,
          id: profileHistoryId,
        },
        "PUT"
      );
      startTime = Date.now();
      totalTime = 0;
      saveToLocalStorage({
        totalTime,
        startTime,
      });
    } catch (error) {
      console.error(error);
    }
  }
}

window.addEventListener(
  "beforeunload",
  saveToLocalStorage({
    totalTime,
    startTime: Date.now(),
  })
);

async function checkInactive() {
  const currentTime = Date.now();
  const inactiveTime = currentTime - startTime;

  if (document.hidden && inactiveTime >= 60000) {
    await updateTimeSpent();
  }
}

async function bpAction(selector, event, eventAction) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(async function (element) {
    element.addEventListener(event, async function (event) {
      const user = readCookie("bp_user");

      let eventData = {
        timestamp: new Date().toISOString(),
        historyId: localStorage.getItem("history") || undefined,
        event: event.type,
        data: "",
      };

      if (element.type === "submit") {
        const form = element.closest("form");
        if (form) {
          const formData = new FormData(form);
          const formInputs = Array.from(formData.entries());
          eventData.data = JSON.stringify(formInputs);
        }
      }

      try {
        await apiCall("profile/action", eventData, "PUT");
      } catch (error) {
        console.error(`Error ${event} updating history:`, error);
      }
    });
  });
}

function bpClick(selector, eventAction) {
  bpAction(selector, "click", eventAction);
}