---
name: weather
description: "Get current weather and forecasts using wttr.in"
metadata:
  openclaw:
    emoji: "🌤️"
    requires:
      bins: ["curl"]
---

# Weather Skill

Get weather information for any location using the wttr.in service.

## Basic Usage

### Current Weather
```bash
# Weather for current location
curl "https://wttr.in?format=3"

# Weather for specific city
curl "https://wttr.in/London?format=3"

# Weather with more details
curl "https://wttr.in/NewYork"
```

### Forecast
```bash
# 3-day forecast
curl "https://wttr.in/SanFrancisco"

# Custom format
curl "https://wttr.in/Tokyo?format=%l:+%c+%t+%w"
```

## Format Options

```bash
# Format codes:
# %c - Weather condition
# %C - Weather condition (text only)
# %h - Humidity
# %t - Temperature
# %f - Feels like temperature
# %w - Wind
# %l - Location
# %m - Moon phase
# %M - Moon day
# %p - Precipitation
# %P - Pressure
# %u - UV index

# Example: "Location: condition, temp, wind"
curl "https://wttr.in?format=%l:+%C,+%t,+%w"
```

## Useful Patterns

```bash
# One-line summary
curl "https://wttr.in/Seattle?format=3"

# ASCII art weather
curl "https://wttr.in/Portland"

# JSON output
curl "https://wttr.in/Boston?format=j1"

# PNG image
curl "https://wttr.in/Chicago.png" > weather.png
```

## Integration Tips

- Use `?format=3` for concise, one-line weather
- Use `?format=j1` for JSON parsing
- Location can be city name, airport code, or coordinates
- Add `?lang=` for different languages (e.g., `?lang=es` for Spanish)
