# 🌦️ Assistant Météo Automatisé (Google Apps Script)

> Système d'automatisation serverless générant des bulletins météo quotidiens personnalisés avec conseils vestimentaires et graphiques visuels.

## 📌 Présentation

Cet outil extrait les prévisions météo pour une ville donnée, applique une logique métier pour déterminer les équipements recommandés (parapluie, veste, lunettes de soleil, etc.), et distribue un rapport synthétique multi-canal.

## 🚀 Fonctionnalités

- **Intégrations Multi-API :** Géocodage de ville et prévisions à 7 jours via Open-Meteo API.
- **Règles Métier & Conseils :** Calcul automatique d'équipements selon les températures et précipitations.
- **Visualisation de Données :** Génération dynamique de graphiques de prévisions via QuickChart.io.
- **Diffusion Multi-Canal Push :**
  - Webhook Discord (cartes Embed enrichies).
  - E-mails au format HTML responsive (Google MailApp).
- **Interface de Gestion Google Sheets :** Panneau de configuration simple avec menu personnalisé.

## 🛠️ Stack Technique

- **Langage & Plateforme :** Google Apps Script (JavaScript)
- **APIs :** Open-Meteo, QuickChart.io
- **Notifications :** Discord Webhooks, Google MailApp
- **Interface :** Google Sheets

## ⚙️ Configuration & Installation

1. Ouvrez une feuille **Google Sheets**.
2. Allez dans **Extensions > Apps Script** et copiez le contenu du fichier `Code.gs`.
3. Configurez les cellules de votre feuille avec les informations suivantes :
   - Ville cible (ex: `Paris, France`)
   - URL du Webhook Discord
   - Adresse e-mail de destination
4. Lancez la fonction `onOpen()` pour faire apparaître le menu sur mesure dans Google Sheets.
5. Planifiez un déclencheur temporel (*Time-driven trigger*) quotidien pour exécuter le bulletin automatiquement chaque matin.