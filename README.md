<div align="center">

# 🎮 ZZZ Stalk

**Scrape Zenless Zone Zero player profiles from [Enka.Network](https://enka.network)**

[![Node.js](https://img.shields.io/badge/Node.js-✓-green.svg)](https://nodejs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-lightgrey.svg)]()

Lightweight, zero-dependencies scraper for ZZZ character builds, stats, W-Engines, Drive Discs, and more.

</div>

---

## ✨ Features

- 📊 **Full character stats** — HP, ATK, DEF, Impact, Crit Rate, Crit DMG, Anomaly Mastery, Energy Regen, Pen Ratio
- 🎭 **Profile info** — Nickname, level, bio, avatar image, medals, platform
- ⚔️ **W-Engine data** — Name, level, rank, rarity, image
- 💿 **Drive Discs** — Slot, level, rarity, main stat, substats with roll counts, set images
- 🎨 **All images included** — Profile avatar, agent icons, weapon icons, drive disc set icons (all from Enka CDN, verified 200 OK)
- 🌐 **Localized names** — English character & weapon names via Enka store localization
- 📦 **Zero dependencies** — Pure Node.js built-in `https` module

---

## 🚀 Quick Start

```bash
node main.js 1316621282
```

---

## 📁 Project Structure

| File          | Purpose                                      |
| ------------- | -------------------------------------------- |
| `main.js`     | CLI entry point — run directly from terminal |
| `scrape.js`   | Core scraper — require-able as a module      |
| `README.md`   | Documentation                                |

---

## 📖 Usage

### CLI

```bash
node main.js <uid>
```

Outputs JSON to `stdout`, progress logs to `stderr`.

### Module — Single UID

```javascript
const { scrapeZZZProfile } = require("./scrape");

const result = await scrapeZZZProfile("1316621282");
console.log(JSON.stringify(result, null, 2));
```

### Module — Multiple UIDs

```javascript
const { scrapeZZZProfile } = require("./scrape");

const uids = ["1316621282", "1500422486", "208472975"];
const results = await Promise.all(uids.map((uid) => scrapeZZZProfile(uid)));

results.forEach((r, i) => {
  console.log(
    `UID ${uids[i]}:`,
    r.status ? `${Object.keys(r.agents).length} agents` : r.error
  );
});
```

### Module — Raw API Access

```javascript
const { httpGet, loadStoreFiles, parseCharacter, parseProfile, fetchProfileAvatarImage } = require("./scrape");

// Fetch raw API data
const apiData = await httpGet("https://enka.network/api/zzz/uid/1316621282");

// Fetch profile avatar image from Enka HTML page
const avatarImage = await fetchProfileAvatarImage("1316621282");

// Load game data for localization
const store = await loadStoreFiles();

// Parse individual character
const firstChar = apiData.PlayerInfo.ShowcaseDetail.AvatarList[0];
const parsed = parseCharacter(firstChar, store);

// Parse player profile
const profile = await parseProfile(
  apiData.PlayerInfo,
  apiData,
  store,
  avatarImage
);
```

---

## 📤 Output Format

### Success Response

```jsonc
{
  "status": true,
  "timestamp": "2026-04-24T08:15:07.697Z",
  "profile": {
    "uid": 1316621282,
    "nickname": "Ray",
    "level": 23,
    "desc": "",
    "avatar_id": 2011,
    "avatar_image": "https://enka.network/ui/zzz/IconInterKnotRole0009.png",
    "title": null,
    "platform": 1,
    "profile_id": 3211061,
    "calling_card": 3300001,
    "medals": []
  },
  "agents": {
    "Corin": {
      "name": "Corin",
      "image": "https://enka.network/ui/zzz/IconRole09.png",
      "statistic": { /* full stats */ },
      "element": "Physical",
      "rarity": "A",
      "mindscape_rank": 0,
      "weapon": {
        "name": "[Lunar] Pleniluna",
        "image": "https://enka.network/ui/zzz/Weapon_B_Common_01.png",
        "level": 1,
        "rank": 0,
        "rarity": "B"
      },
      "drive_discs": [ /* with images & substats */ ],
      "skills": { /* with mindscape bonuses */ }
    }
  }
}
```

### Error Response

```json
{
  "status": false,
  "timestamp": "2026-04-24T08:15:07.697Z",
  "error": "Player not found or showcase is closed"
}
```

---

## 📊 Exported Functions

| Function                      | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `scrapeZZZProfile(uid)`       | High-level: fetch + parse, returns full JSON   |
| `parseProfile(playerInfo, apiData, store, avatarImage)` | Parse player profile data       |
| `loadStoreFiles()`            | Load game data (avatars, weapons, locs, etc.)  |
| `parseCharacter(charData, store)` | Parse raw character into structured format |
| `httpGet(url)`                | HTTP GET helper with redirect & timeout        |
| `fetchProfileAvatarImage(uid)` | Fetch profile avatar from Enka HTML page      |

---

## 🖼️ Image Coverage

All image URLs are sourced from the Enka.Network CDN (`https://enka.network/ui/zzz/`) and verified to return `200 OK`:

| Field              | Pattern                                      | Example                                      |
| ------------------ | -------------------------------------------- | -------------------------------------------- |
| Profile Avatar     | `/ui/zzz/IconInterKnotRoleXXXX.png`           | `IconInterKnotRole0009.png`                  |
| Agent Icon         | `/ui/zzz/IconRoleXX.png`                      | `IconRole09.png` (Corin)                     |
| W-Engine Icon      | `/ui/zzz/Weapon_{Rarity}_{Id}.png`            | `Weapon_A_1011.png`                          |
| Drive Disc Set Icon| `/ui/zzz/Suit{Name}.png`                      | `SuitShockstarDisco.png`                     |

---

## ⚠️ HTTP Status Codes

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| 400  | Wrong UID format                             |
| 404  | Player not found                             |
| 424  | Game maintenance / API unavailable           |
| 429  | Rate limited — wait before retrying          |
| 500  | Server error                                 |
| 503  | Service unavailable                          |

---

## 🗂️ Data Sources

| Source | URL |
| ------ | --- |
| **API** | `https://enka.network/api/zzz/uid/<uid>` |
| **HTML Page** | `https://enka.network/zzz/<uid>/` (for profile avatar) |
| **Store Files** | [EnkaNetwork/API-docs/store/zzz](https://github.com/EnkaNetwork/API-docs/tree/master/store/zzz) |
| `avatars.json` | Base stats, growth, promotion curves |
| `weapons.json` | W-Engine definitions |
| `equipments.json` | Drive Disc items & set bonuses |
| `property.json` | Stat property definitions |
| `locs.json` | Localized names (multi-language) |

---

## 📋 Requirements

- **Node.js** — no external dependencies required

---

<div align="center">

**Made with ❤️ for all**

[Enka.Network](https://enka.network) • [API Docs](https://github.com/EnkaNetwork/API-docs)

</div>
