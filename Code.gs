// ==========================================
// 1. SERVICES EXTERNES (APIs, Discord & Mail)
// ==========================================

// Geocoding : nom de ville -> coordonnées GPS
const getCoordinatesFromCityName = (cityName) => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());

  if (!data.results || data.results.length === 0) {
    throw new Error(`Ville introuvable : "${cityName}"`);
  }

  return {
    name: data.results[0].name,
    country: data.results[0].country,
    latitude: data.results[0].latitude,
    longitude: data.results[0].longitude
  };
};

// Open-Meteo : prévisions
const fetchWeatherData = (latitude, longitude) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  return JSON.parse(response.getContentText());
};

// Choisir une couleur d'Embed dynamique pour Discord selon la météo
const getEmbedColor = (weatherCode, tempMax) => {
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82];
  if (rainCodes.includes(weatherCode)) return 3447003;  // Bleu
  if (tempMax >= 25) return 15158332;                   // Orange/Rouge
  if (tempMax <= 10) return 10181046;                   // Gris
  return 15844367;                                      // Jaune
};

// Envoi de la notification Push via Discord (Carte Embed)
const sendDiscordPushNotification = (webhookUrl, recommendations, weatherDetails, locationInfo) => {
  const embedColor = getEmbedColor(weatherDetails.weatherCode, weatherDetails.tempMax);
  const formattedDate = new Date().toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long' });

  const embedPayload = {
    content: "@everyone 🌦️ **Nouvelle alerte Météo disponible !**",
    embeds: [
      {
        title: `🌦️ Météo & Conseils — ${locationInfo.name} (${locationInfo.country})`,
        description: `Voici vos recommandations pour aujourd'hui, **${formattedDate}** :`,
        color: embedColor,
        fields: [
          {
            name: "💡 Recommandations Équipement",
            value: recommendations.map(r => "• " + r).join("\n"),
            inline: false
          },
          {
            name: "🌡️ Températures",
            value: `**Max :** ${weatherDetails.tempMax}°C\n**Min :** ${weatherDetails.tempMin}°C`,
            inline: true
          },
          {
            name: "🌧️ Précipitations",
            value: `${weatherDetails.pluie} mm`,
            inline: true
          }
        ],
        footer: {
          text: "Assistant Météo Automatisé • Google Apps Script & Open-Meteo"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  const response = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(embedPayload),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  if (responseCode === 429) {
    throw new Error("Trop de requêtes envoyées à Discord (Rate Limit). Patientez 1 minute.");
  } else if (responseCode < 200 || responseCode >= 300) {
    throw new Error(`Erreur Discord (${responseCode}) : ${response.getContentText()}`);
  }
};

// Envoi de la notification par E-mail
const sendEmailNotification = (userEmail, recommendations, weatherDetails, locationInfo) => {
  const formattedDate = new Date().toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long' });
  const subject = `🌦️ Météo du jour à ${locationInfo.name} — ${formattedDate}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
      <h2 style="color: #2c3e50;">🌦️ Météo & Conseils pour ${locationInfo.name} (${locationInfo.country})</h2>
      <p style="color: #7f8c8d;">Prévisions pour le <strong>${formattedDate}</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eeeeee;" />
      
      <h3 style="color: #2980b9;">💡 Recommandations Équipement :</h3>
      <ul>
        ${recommendations.map(r => `<li style="font-size: 15px; margin-bottom: 5px;">${r.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join("")}
      </ul>
      
      <hr style="border: none; border-top: 1px solid #eeeeee;" />
      
      <h3 style="color: #27ae60;">📊 Détails Météo :</h3>
      <p style="font-size: 14px; line-height: 1.6;">
        🌡️ <strong>Température Max :</strong> ${weatherDetails.tempMax}°C<br/>
        🌡️ <strong>Température Min :</strong> ${weatherDetails.tempMin}°C<br/>
        🌧️ <strong>Précipitations :</strong> ${weatherDetails.pluie} mm
      </p>
      
      <p style="font-size: 12px; color: #95a5a6; margin-top: 20px;">
        Notification envoyée automatiquement par ton <em>Assistant Météo Google Apps Script</em>.
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: userEmail,
    subject: subject,
    htmlBody: htmlBody
  });
};

// ==========================================
// 2. LOGIQUE MÉTIER
// ==========================================

const getRecommendations = (dailyData) => {
  const recommendations = [];
  const tempMax = dailyData.temperature_2m_max[0];
  const tempMin = dailyData.temperature_2m_min[0];
  const precipitation = dailyData.precipitation_sum[0];
  const weatherCode = dailyData.weathercode[0];

  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82];
  if (precipitation > 0.5 || rainCodes.includes(weatherCode)) {
    recommendations.push("Prends un parapluie ☔ *(pluie prévue)*");
  }

  if (tempMax < 12) {
    recommendations.push("Prends un gros manteau 🧥 *(temps frais)*");
  } else if (tempMax < 18 || tempMin < 10) {
    recommendations.push("Prends une veste légère 🧥");
  }

  if ([0, 1].includes(weatherCode) && tempMax >= 18) {
    recommendations.push("N'oublie pas tes lunettes de soleil 🕶️");
  }

  if (recommendations.length === 0) {
    recommendations.push("**Tenue standard, rien de particulier à prévoir 👌**");
  }

  return recommendations;
};

// ==========================================
// 3. EXÉCUTION PRINCIPALE & MENU
// ==========================================

const onOpen = () => {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🌦️ Assistant Météo")
    .addItem("Envoyer la notif du jour", "runWeatherAssistantFromSheet")
    .addToUi();
};

function runWeatherAssistantFromSheet() {
  // Récupère automatiquement le fichier actif lié au script
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  const cityName = sheet.getRange("B1").getValue();
  const discordWebhookUrl = sheet.getRange("B2").getValue();
  const userEmail = sheet.getRange("B3").getValue();

  if (!cityName) {
    console.log("Erreur : Veuillez renseigner une ville en B1.");
    return;
  }

  try {
    const locationInfo = getCoordinatesFromCityName(cityName);
    const weatherData = fetchWeatherData(locationInfo.latitude, locationInfo.longitude);
    const daily = weatherData.daily;

    const recommendations = getRecommendations(daily);
    const weatherDetails = {
      date: daily.time[0],
      tempMax: daily.temperature_2m_max[0],
      tempMin: daily.temperature_2m_min[0],
      pluie: daily.precipitation_sum[0],
      weatherCode: daily.weathercode[0]
    };

    // 1. Envoi Discord
    if (discordWebhookUrl) {
      sendDiscordPushNotification(discordWebhookUrl, recommendations, weatherDetails, locationInfo);
    }

    // 2. Envoi E-mail
    if (userEmail) {
      sendEmailNotification(userEmail, recommendations, weatherDetails, locationInfo);
    }

    if (!discordWebhookUrl && !userEmail) {
      console.log("Attention : Aucun canal de diffusion renseigné (B2 ou B3).");
      return;
    }

    console.log(`Succès : Notifications envoyées pour ${locationInfo.name} !`);

  } catch (error) {
    console.error("Erreur lors de l'exécution : " + error.message);
  }
}