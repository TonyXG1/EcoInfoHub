import express from "express";

const router = express.Router();

function calculateLevel(pollutant, low, high, data) {
  if (data[pollutant] === "N/A") return null;
  else if (data[pollutant] <= low) return "normal";
  else if (data[pollutant] <= high) return "increased";
  else return "dangerous";
}

function fillLevels(data, levels) {
  levels.co = calculateLevel("co", 5000, 10000, data);
  levels.no2 = calculateLevel("no2", 40, 200, data);
  levels.o3 = calculateLevel("o3", 100, 180, data);
  levels.pm10 = calculateLevel("pm10", 45, 150, data);
  levels.so2 = calculateLevel("so2", 50, 200, data);
}

async function fetchSensors(sensorIds, apiClient, data, levels) {
  for (const [key, id] of Object.entries(sensorIds)) {
    const response = await apiClient.get(`sensors/${id}`);
    const value = response.data.results[0].latest.value;
    data[key] = value < 0 ? "N/A" : value.toFixed(2);
  }
  fillLevels(data, levels);
}

export default function (apiClient, data, levels, loggedUser) {
  router.get("/monitor/:location", async (req, res) => {
    const locations = {
      StaraZagora: {
        name: "Стара Загора - Зелен клин",
        sensorIds: { co: 25814, no2: 25813, o3: 25812, pm10: 25811, so2: 25810 },
      },
      Sofia: {
        name: "София - Хиподрума",
        sensorIds: { co: 25834, no2: 25833, o3: 25832, pm10: 25831, so2: 25830 },
      },
      Plovdiv: {
        name: "Пловдив - Каменица",
        sensorIds: { co: 25829, no2: 25828, o3: 25827, pm10: 25826, so2: 25825 },
      },
      Burgas: {
        name: "Бургас - Меден Рудник",
        sensorIds: { co: 39530, no2: 25809, o3: 25808, pm10: 25807, so2: 25806 },
      },
      Varna: {
        name: "Варна - СОУ",
        sensorIds: { co: 25779, no2: 25778, o3: 25777, pm10: 25776, so2: 25774 },
      },
    };

    const location = locations[req.params.location];
    if (!location) {
      return res.status(404).send("Location not found");
    }

    try {
      await fetchSensors(location.sensorIds, apiClient, data, levels);
      res.render("monitor.ejs", {
        loggedUser,
        location: location.name,
        sensorData: data,
        levels,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error fetching sensor data");
    }
  });
  
  return router;
}
