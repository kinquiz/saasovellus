var chart = null;
var map = null;
var marker = null;

function describeWeather(code) {
  if (code === 0) return ["Selkeää", "☀️"];
  if (code <= 3) return ["Puolipilvistä", "⛅"];
  if (code <= 48) return ["Sumua", "🌫️"];
  if (code <= 67) return ["Sadetta", "🌧️"];
  if (code <= 77) return ["Lumisadetta", "❄️"];
  if (code <= 82) return ["Sadekuuroja", "🌦️"];
  if (code <= 86) return ["Lumikuuroja", "🌨️"];
  return ["Ukkosta", "⛈️"];
}

function formatDate(text) {
  return new Date(text).toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "numeric"
  });
}

function loadWeather(lat, lon, name) {
  $("#current").html("<p>Ladataan...</p>");
  var url = "https://api.open-meteo.com/v1/forecast"
    + "?latitude=" + lat
    + "&longitude=" + lon
    + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
    + "&timezone=auto&forecast_days=7";

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      showCurrent(data.current, name);
      showForecast(data.daily);
      drawChart(data.daily);
      moveMap(lat, lon, name);
    })
    .catch(function (error) {
      console.log(error);
      $("#current").html("<p>Säätä ei voitu ladata. Yritä uudelleen.</p>");
    });
}

function showCurrent(c, name) {
  var info = describeWeather(c.weather_code);
  $("#current").html(
    "<h2>" + name + "</h2>" +
    "<div class='big'>" + info[1] + " " + Math.round(c.temperature_2m) + "°C</div>" +
    "<p>" + info[0] + "</p>" +
    "<p>Tuntuu kuin " + Math.round(c.apparent_temperature) + "°C</p>" +
    "<p>Ilmankosteus " + c.relative_humidity_2m + " %</p>" +
    "<p>Tuuli " + c.wind_speed_10m + " km/h</p>"
  );
}

function showForecast(d) {
  var html = "";
  for (var i = 0; i < d.time.length; i++) {
    var info = describeWeather(d.weather_code[i]);
    html += "<div class='day'>" +
      "<div>" + formatDate(d.time[i]) + "</div>" +
      "<div>" + info[1] + "</div>" +
      "<div>" + Math.round(d.temperature_2m_max[i]) + "° / " + Math.round(d.temperature_2m_min[i]) + "°</div>" +
      "<div>" + d.precipitation_sum[i] + " mm</div>" +
      "</div>";
  }
  $("#forecast").html(html);
}

function drawChart(d) {
  var labels = [];
  for (var i = 0; i < d.time.length; i++) {
    labels.push(formatDate(d.time[i]));
  }
  if (chart) {
    chart.destroy();
  }
  chart = new Chart($("#chart"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        { label: "Ylin °C", data: d.temperature_2m_max, borderColor: "red" },
        { label: "Alin °C", data: d.temperature_2m_min, borderColor: "blue" }
      ]
    }
  });
}

function setupMap() {
  map = L.map("map").setView([62.89, 27.68], 5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
  map.on("click", function (e) {
    var lat = e.latlng.lat;
    var lon = e.latlng.lng;
    loadWeather(lat, lon, "Valittu piste (" + lat.toFixed(2) + ", " + lon.toFixed(2) + ")");
  });
}

function moveMap(lat, lon, name) {
  if (marker) {
    map.removeLayer(marker);
  }
  marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(name);
  map.panTo([lat, lon]);
}

function searchCities(text) {
  var url = "https://geocoding-api.open-meteo.com/v1/search?name=" + text + "&count=5&language=fi";
  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      showSuggestions(data.results || []);
    })
    .catch(function (error) {
      console.log(error);
    });
}

function showSuggestions(cities) {
  $("#suggestions").empty();
  if (cities.length === 0) {
    $("#suggestions").append("<li>Kaupunkeja ei löytynyt</li>");
  }
  cities.forEach(function (city) {
    var label = city.name + ", " + city.country;
    var item = $("<li>").text(label);
    item.on("click", function () {
      loadWeather(city.latitude, city.longitude, label);
      $("#search-input").val(city.name);
      $("#suggestions").prop("hidden", true);
    });
    $("#suggestions").append(item);
  });
  $("#suggestions").prop("hidden", false);
}

$("#search-input").on("input", function () {
  var text = $(this).val().trim();
  if (text.length < 2) {
    $("#suggestions").prop("hidden", true);
  } else {
    searchCities(text);
  }
});

setupMap();
loadWeather(60.192059, 24.945831, "Helsinki, Suomi");
