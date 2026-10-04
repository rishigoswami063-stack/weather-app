
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import WaterDropOutlinedIcon from "@mui/icons-material/WaterDropOutlined";
import AirOutlinedIcon from "@mui/icons-material/Air";
import CompressOutlinedIcon from "@mui/icons-material/Compress";

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

// Manali, Himachal Pradesh
const MANALI_COORDS = {
  lat: 32.2396,
  lon: 77.1887,
};

function getWeatherStyle(condition = "", iconCode = "") {
  const value = condition.toLowerCase();

  if (value.includes("thunder")) {
    return { emoji: "⛈️", theme: "weather-storm" };
  }

  if (value.includes("rain") || value.includes("drizzle")) {
    return { emoji: "🌧️", theme: "weather-rain" };
  }

  if (value.includes("snow")) {
    return { emoji: "❄️", theme: "weather-snow" };
  }

  if (
    value.includes("mist") ||
    value.includes("fog") ||
    value.includes("haze") ||
    value.includes("smoke")
  ) {
    return { emoji: "🌫️", theme: "weather-mist" };
  }

  if (value.includes("cloud")) {
    return { emoji: "☁️", theme: "weather-clouds" };
  }

  if (value.includes("clear") && iconCode.endsWith("n")) {
    return { emoji: "🌙", theme: "weather-night" };
  }

  if (value.includes("clear")) {
    return { emoji: "☀️", theme: "weather-clear" };
  }

  return { emoji: "🌤️", theme: "weather-default" };
}

function getWeatherUrl(city) {
  const name = city.trim();

  if (name.toLowerCase() === "manali") {
    return (
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${MANALI_COORDS.lat}&lon=${MANALI_COORDS.lon}` +
      `&appid=${API_KEY}&units=metric`
    );
  }

  return (
    `https://api.openweathermap.org/data/2.5/weather` +
    `?q=${encodeURIComponent(name)}` +
    `&appid=${API_KEY}&units=metric`
  );
}

function getForecastUrl(city) {
  const name = city.trim();

  if (name.toLowerCase() === "manali") {
    return (
      `https://api.openweathermap.org/data/2.5/forecast` +
      `?lat=${MANALI_COORDS.lat}&lon=${MANALI_COORDS.lon}` +
      `&appid=${API_KEY}&units=metric`
    );
  }

  return (
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?q=${encodeURIComponent(name)}` +
    `&appid=${API_KEY}&units=metric`
  );
}

function getDayName(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(
    "en-IN",
    { weekday: "short" }
  );
}

function App() {
  const [city, setCity] = useState("New Delhi");
  const [search, setSearch] = useState("");
  const [isFahrenheit, setIsFahrenheit] = useState(false);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      if (!API_KEY) {
        setWeather(null);
        setForecast([]);
        setError("API key missing. Please check your .env file.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [currentResponse, forecastResponse] =
          await Promise.all([
            fetch(getWeatherUrl(city)),
            fetch(getForecastUrl(city)),
          ]);

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        if (!currentResponse.ok) {
          if (currentResponse.status === 404) {
            throw new Error(
              "City not found. Check the spelling and try again."
            );
          }

          if (currentResponse.status === 401) {
            throw new Error(
              "API key is invalid or not activated yet."
            );
          }

          throw new Error(
            currentData.message || "Unable to fetch weather."
          );
        }

        if (!forecastResponse.ok) {
          throw new Error(
            forecastData.message || "Unable to fetch forecast."
          );
        }

        if (cancelled) return;

        setWeather(currentData);

        // Group forecast records by date.
        const groupedForecast = {};

        forecastData.list.forEach((item) => {
          const date = item.dt_txt.split(" ")[0];

          if (!groupedForecast[date]) {
            groupedForecast[date] = [];
          }

          groupedForecast[date].push(item);
        });

        const dailyForecast = Object.entries(groupedForecast)
          .map(([date, items]) => {
            // Choose the forecast closest to noon.
            const middayItem = items.reduce((best, item) => {
              const hour = Number(
                item.dt_txt.split(" ")[1].slice(0, 2)
              );
              const bestHour = Number(
                best.dt_txt.split(" ")[1].slice(0, 2)
              );

              return Math.abs(hour - 12) < Math.abs(bestHour - 12)
                ? item
                : best;
            });

            const minTemp = Math.min(
              ...items.map((item) => item.main.temp_min)
            );

            const maxTemp = Math.max(
              ...items.map((item) => item.main.temp_max)
            );

            const condition = middayItem.weather[0].main;
            const icon = middayItem.weather[0].icon;

            return {
              date,
              day: getDayName(date),
              minTemp,
              maxTemp,
              condition,
              style: getWeatherStyle(condition, icon),
            };
          })
          .slice(0, 5);

        setForecast(dailyForecast);
      } catch (err) {
        if (!cancelled) {
          setWeather(null);
          setForecast([]);
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [city]);

  function handleSearch(event) {
    event.preventDefault();

    const trimmedSearch = search.trim();

    if (!trimmedSearch) return;

    setCity(trimmedSearch);
    setSearch("");
  }

  function formatTemp(temp) {
    const value = isFahrenheit
      ? (temp * 9) / 5 + 32
      : temp;

    return `${Math.round(value)}°${isFahrenheit ? "F" : "C"}`;
  }

  const currentStyle = getWeatherStyle(
    weather?.weather?.[0]?.main || "",
    weather?.weather?.[0]?.icon || ""
  );

  return (
    <Box className={`weather-app ${currentStyle.theme}`}>
      <Container maxWidth="md" className="weather-container">
        <Box className="app-header">
          <Typography variant="h4" className="app-title">
            Weatherly
          </Typography>

          <Typography className="app-subtitle">
            Your daily weather companion
          </Typography>
        </Box>

        <Paper elevation={0} className="weather-dashboard">
          {/* City search */}
          <Box
            component="form"
            onSubmit={handleSearch}
            className="search-form"
          >
            <TextField
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search city, e.g. Manali"
              variant="outlined"
              size="small"
              slotProps={{
                htmlInput: {
                  "aria-label": "Search city",
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              aria-label="Search weather"
              disabled={loading || !search.trim()}
              className="search-button"
            >
              <SearchIcon />
              <Box component="span" sx={{ ml: 0.75 }}>
                Search
              </Box>
            </Button>
          </Box>

          {/* Temperature unit */}
          <Box className="unit-toggle">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={isFahrenheit ? "F" : "C"}
              onChange={(_, value) => {
                if (value) {
                  setIsFahrenheit(value === "F");
                }
              }}
              aria-label="Temperature unit"
            >
              <ToggleButton value="C">°C</ToggleButton>
              <ToggleButton value="F">°F</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box className="loading-state">
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>
                Getting the latest weather...
              </Typography>
            </Box>
          )}

          {!loading && weather && (
            <>
              {/* Current weather */}
              <Box className="current-weather">
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                  }}
                  className="location-name"
                >
                  <LocationOnOutlinedIcon />

                  <Typography variant="h5">
                    {weather.name}
                    {weather.sys?.country
                      ? `, ${weather.sys.country}`
                      : ""}
                  </Typography>
                </Stack>

                {city.trim().toLowerCase() === "manali" && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center" }}
                  >
                    Himachal Pradesh, India
                  </Typography>
                )}

                <Typography className="weather-date">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </Typography>

                <Typography className="current-weather-emoji">
                  {currentStyle.emoji}
                </Typography>

                <Typography className="current-temperature">
                  {formatTemp(weather.main.temp)}
                </Typography>

                <Typography className="weather-description">
                  {weather.weather[0].description}
                </Typography>

                <Typography className="feels-like">
                  Feels like {formatTemp(weather.main.feels_like)}
                </Typography>

                {/* Weather details */}
                <Grid
                  container
                  spacing={2}
                  className="weather-details"
                >
                  <Grid size={{ xs: 4 }}>
                    <Paper className="detail-item" elevation={0}>
                      <WaterDropOutlinedIcon />
                      <Typography className="detail-value">
                        {weather.main.humidity}%
                      </Typography>
                      <Typography className="detail-label">
                        Humidity
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 4 }}>
                    <Paper className="detail-item" elevation={0}>
                      <AirOutlinedIcon />
                      <Typography className="detail-value">
                        {weather.wind.speed} m/s
                      </Typography>
                      <Typography className="detail-label">
                        Wind speed
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 4 }}>
                    <Paper className="detail-item" elevation={0}>
                      <CompressOutlinedIcon />
                      <Typography className="detail-value">
                        {weather.main.pressure} hPa
                      </Typography>
                      <Typography className="detail-label">
                        Pressure
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* Five-day forecast */}
              <Box className="forecast-section">
                <Typography
                  variant="h6"
                  className="forecast-heading"
                >
                  5-Day Forecast
                </Typography>

                <Grid
                  container
                  spacing={1.5}
                  className="forecast-grid"
                >
                  {forecast.map((day) => (
                    <Grid
                      key={day.date}
                      size={{ xs: 6, sm: 4, md: 2.4 }}
                    >
                      <Paper
                        className="forecast-card"
                        elevation={0}
                      >
                        <Typography className="forecast-day">
                          {day.day}
                        </Typography>

                        <Typography className="forecast-emoji">
                          {day.style.emoji}
                        </Typography>

                        <Typography className="forecast-condition">
                          {day.condition}
                        </Typography>

                        <Typography className="forecast-high-low">
                          {formatTemp(day.maxTemp)} /{" "}
                          {formatTemp(day.minTemp)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          )}
        </Paper>

        <Typography className="app-footer">
          Weather data provided by OpenWeather
        </Typography>
      </Container>
    </Box>
  );
}

export default App;
