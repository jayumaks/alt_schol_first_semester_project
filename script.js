// Convert a WMO weather code into a human-readable description and emoji icon
function getWeatherDescription(code) {
  const weatherMap = {
    0: { description: "Clear sky", icon: "☀️" },
    1: { description: "Partly cloudy", icon: "⛅" },
    2: { description: "Partly cloudy", icon: "⛅" },
    3: { description: "Partly cloudy", icon: "⛅" },
    45: { description: "Foggy", icon: "🌫️" },
    48: { description: "Foggy", icon: "🌫️" },
    51: { description: "Drizzle", icon: "🌦️" },
    53: { description: "Drizzle", icon: "🌦️" },
    55: { description: "Drizzle", icon: "🌦️" },
    61: { description: "Rain", icon: "🌧️" },
    63: { description: "Rain", icon: "🌧️" },
    65: { description: "Rain", icon: "🌧️" },
    71: { description: "Snow", icon: "❄️" },
    73: { description: "Snow", icon: "❄️" },
    75: { description: "Snow", icon: "❄️" },
    80: { description: "Rain showers", icon: "🌦️" },
    81: { description: "Rain showers", icon: "🌦️" },
    82: { description: "Rain showers", icon: "🌦️" },
    95: { description: "Thunderstorm", icon: "⛈️" },
  };
  // Fall back to a generic entry if a code isn't in our table
  return weatherMap[code] || { description: "Unknown", icon: "❓" };
}

// Convert a raw UV index number into the category labels shown on the mockup
// (Low / Moderate / High / Very High), since the API gives a number, not a label
function getUVCategory(uvValue) {
  if (uvValue === undefined || uvValue === null) return "--";
  if (uvValue < 3) return "Low";
  if (uvValue < 6) return "Moderate";
  if (uvValue < 8) return "High";
  if (uvValue < 11) return "Very High";
  return "Extreme";
}

// Show or hide the "Loading..." indicator
function setLoading(isLoading) {
  const loadingEl = document.getElementById("loading");
  loadingEl.classList.toggle("hidden", !isLoading);
}

// Display an error message in the visible error area
function showError(message) {
  const errorEl = document.getElementById("errorMessage");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

// Hide the error message area (called at the start of every new search)
function clearError() {
  const errorEl = document.getElementById("errorMessage");
  errorEl.classList.add("hidden");
}

// Get coordinates for a city name using the Open-Meteo Geocoding API
async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  const data = await response.json();

  // If the API returns no results, the city name didn't match anything
  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Please check the spelling and try again.");
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

// Fetch current weather and 5-day forecast using coordinates from getCoordinates()
// Note: uv_index_max is added to the daily params so the UV Index stat has real data,
// since the brief's basic API reference table didn't include it but the design needs it
async function getWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,uv_index_max&timezone=auto`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not fetch weather data. Please try again.");
  }

  return await response.json();
}

// Update the DOM with current weather data
function displayCurrentWeather(current, daily, cityName, country) {
  const weather = getWeatherDescription(current.weather_code);

  document.getElementById("cityName").textContent = `${cityName}, ${country}`;
  document.getElementById("temperature").textContent = `${Math.round(current.temperature_2m)}°C`;
  document.getElementById("description").textContent = weather.description;
  document.getElementById("weatherIcon").textContent = weather.icon;
  document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
  document.getElementById("windSpeed").textContent = `${current.wind_speed_10m} km/h`;
  // Today's UV max comes from the daily array at index 0
  document.getElementById("uvIndex").textContent = getUVCategory(daily.uv_index_max[0]);
}

// Update the DOM with the 5-day forecast (builds 5 rows from the daily arrays)
function displayForecast(daily) {
  const forecastContainer = document.getElementById("forecastContainer");
  forecastContainer.innerHTML = ""; // clear any previous results before rendering new ones

  for (let i = 0; i < 5; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "long" });
    const weather = getWeatherDescription(daily.weather_code[i]);
    const high = Math.round(daily.temperature_2m_max[i]);
    const low = Math.round(daily.temperature_2m_min[i]);

    const row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML = `
      <span class="forecast-day">${dayName}</span>
      <span class="forecast-icon">${weather.icon}</span>
      <span class="forecast-temps">${high}° <span class="forecast-low">${low}°</span></span>
    `;
    forecastContainer.appendChild(row);
  }
}

// Main function: runs when the search form is submitted.
// Coordinates the whole flow — geocode, fetch weather, update DOM, handle errors.
async function handleSearch(event) {
  event.preventDefault(); // stop the form from reloading the page on submit

  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  clearError();
  setLoading(true);

  try {
    const location = await getCoordinates(city);
    const weatherData = await getWeather(location.latitude, location.longitude);

    displayCurrentWeather(weatherData.current, weatherData.daily, location.name, location.country);
    displayForecast(weatherData.daily);
  } catch (error) {
    // Any failure in geocoding or fetching weather lands here
    showError(error.message);
  } finally {
    // Always hide the loading indicator, whether the search succeeded or failed
    setLoading(false);
  }
}

// Wire up the form's submit event (covers both clicking Search and pressing Enter)
document.getElementById("searchForm").addEventListener("submit", handleSearch);
