/**
 * Scrape ZZZ Profile
 *
 * Base URL: https://enka.network/api/zzz/uid/<uid>
 * github : https://github.com/yellow-env/zzz-stalk
 */

const https = require("https");

const STORE_URLS = {
  avatars:
    "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz/avatars.json",
  weapons:
    "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz/weapons.json",
  equipments:
    "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz/equipments.json",
  properties:
    "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz/property.json",
  locs: "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz/locs.json",
};

const PROPERTY_MAP = {
  11101: "hp_base",
  11102: "hp_percent",
  11103: "hp_flat",
  12101: "atk_base",
  12102: "atk_percent",
  12103: "atk_flat",
  12201: "impact",
  12202: "impact_percent",
  13101: "def_base",
  13102: "def_percent",
  13103: "def_flat",
  20101: "crit_rate",
  20103: "crit_rate_flat",
  21101: "crit_dmg",
  21103: "crit_dmg_flat",
  23101: "pen_ratio",
  23103: "pen_ratio_flat",
  23201: "pen_flat",
  23203: "pen_flat2",
  30501: "energy_regen",
  30502: "energy_regen_percent",
  30503: "energy_regen_flat",
  31201: "anomaly_proficiency",
  31203: "anomaly_proficiency_flat",
  31401: "anomaly_mastery",
  31402: "anomaly_mastery_percent",
  31403: "anomaly_mastery_flat",
  31501: "physical_dmg_bonus",
  31503: "physical_dmg_bonus_flat",
  31601: "fire_dmg_bonus",
  31603: "fire_dmg_bonus_flat",
  31701: "ice_dmg_bonus",
  31703: "ice_dmg_bonus_flat",
  31801: "electric_dmg_bonus",
  31803: "electric_dmg_bonus_flat",
  31901: "ether_dmg_bonus",
  31903: "ether_dmg_bonus_flat",
};

const SKILL_NAMES = {
  0: "basic_attack",
  1: "special_attack",
  2: "dash",
  3: "ultimate",
  5: "core_skill",
  6: "assist",
};

const RARITY_MAP = { 4: "S", 3: "A", 2: "B" };

const ELEMENT_MAP = {
  Physics: "Physical",
  Fire: "Fire",
  Ice: "Ice",
  Elec: "Electric",
  Ether: "Ether",
};

const ENKA_CDN = "https://enka.network";

function buildImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return ENKA_CDN + path;
}

function getLocalizedName(internalName, store) {
  if (!internalName) return null;
  if (
    store.locsEn &&
    typeof store.locsEn === "object" &&
    store.locsEn[internalName]
  ) {
    return store.locsEn[internalName];
  }
  if (store.locs && typeof store.locs === "object") {
    if (store.locs.en && store.locs.en[internalName])
      return store.locs.en[internalName];
    if (store.locs[internalName]) return store.locs[internalName];
  }
  return null;
}

function httpGet(url, timeout = 15000, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const cleanUrl = url.trim();
    const req = https.get(
      cleanUrl,
      { headers: { "User-Agent": "ZZZ-Profile-Scraper/1.0" }, timeout },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
          const newUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, cleanUrl).href;
          return httpGet(newUrl, timeout, maxRedirects - 1).then(
            resolve,
            reject,
          );
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error("Failed to parse JSON response"));
            }
          } else {
            const errors = {
              400: "Wrong UID format",
              404: "Player not found",
              424: "Game maintenance or API unavailable",
              429: "Rate limited",
              500: "Server error",
              503: "Service unavailable",
            };
            reject(
              new Error(errors[res.statusCode] || `HTTP ${res.statusCode}`),
            );
          }
        });
      },
    );
    req.on("error", (e) => reject(new Error(`Network error: ${e.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

async function loadStoreFiles() {
  const results = await Promise.allSettled(
    Object.values(STORE_URLS).map((url) => httpGet(url)),
  );
  const locsRaw = results[4].status === "fulfilled" ? results[4].value : {};
  const locsEn = locsRaw.en || locsRaw;
  const equipmentsRaw = results[2].status === "fulfilled" ? results[2].value : {};
  return {
    avatars: results[0].status === "fulfilled" ? results[0].value : {},
    weapons: results[1].status === "fulfilled" ? results[1].value : {},
    equipments:
      results[2].status === "fulfilled"
        ? results[2].value.Items || results[2].value
        : {},
    equipmentsRaw,
    properties: results[3].status === "fulfilled" ? results[3].value : {},
    locs: locsRaw,
    locsEn,
  };
}

function calculateBaseStats(charData, avatarStore) {
  const level = charData.Level || 1;
  const promoLevel = charData.PromotionLevel || 0;
  const coreEnh = charData.CoreSkillEnhancement || 0;
  const baseProps = avatarStore.BaseProps || {};
  const growthProps = avatarStore.GrowthProps || {};
  const promoProps = avatarStore.PromotionProps || [];
  const coreProps = avatarStore.CoreEnhancementProps || [];
  const calcStat = (propId) => {
    const base = baseProps[propId] || 0;
    const growth = growthProps[propId]
      ? Math.floor((growthProps[propId] * (level - 1)) / 10000)
      : 0;
    const promo = (promoProps[promoLevel - 1] || {})[propId] || 0;
    const core = (coreProps[coreEnh] || {})[propId] || 0;
    return base + growth + promo + core;
  };
  return {
    hp: calcStat(11101),
    atk: calcStat(12101),
    def: calcStat(13101),
    impact: calcStat(12201),
    crit_rate: (calcStat(20101) || 500) / 10000,
    crit_dmg: (calcStat(21101) || 5000) / 10000,
    anomaly_mastery: calcStat(31401),
    anomaly_proficiency: calcStat(31201),
    energy_regen: (calcStat(30501) || 120) / 10000,
  };
}

function parseSkills(skillList, mindscapeLevel) {
  if (!skillList || typeof skillList !== "object") return {};
  const bonus = mindscapeLevel >= 5 ? 4 : mindscapeLevel >= 3 ? 2 : 0;
  const skills = {};
  for (const [idx, val] of Object.entries(skillList)) {
    const name = SKILL_NAMES[idx];
    if (!name) continue;
    let level = 0;
    if (typeof val === "object" && val !== null)
      level = val.Level || val.level || 0;
    else level = val || 0;
    skills[name] = level + bonus;
  }
  return skills;
}

function parseWeapon(weaponData, weaponStore, store) {
  if (!weaponData?.Id) return null;
  const storeWep = weaponStore[weaponData.Id] || {};
  let name = storeWep.ItemName || storeWep.Name || `Weapon_${weaponData.Id}`;
  const localizedName = getLocalizedName(name, store);
  if (localizedName) name = localizedName;
  const image = buildImageUrl(storeWep.ImagePath);
  return {
    name,
    image,
    level: weaponData.Level || 1,
    rank: weaponData.BreakLevel || 0,
    rarity: RARITY_MAP[storeWep.Rarity] || String(storeWep.Rarity || "?"),
  };
}

function parseDisc(equipped, equipStore, store) {
  const eq = equipped?.Equipment;
  if (!eq?.Id) return null;
  const equipId = String(eq.Id);
  const storeEq = equipStore[equipId] || {};
  const slot = equipped.Slot || 0;

  const suitId = storeEq.SuitId;
  let image = null;
  if (suitId && store.equipmentsRaw?.Suits?.[suitId]) {
    image = buildImageUrl(store.equipmentsRaw.Suits[suitId].Icon);
  }

  const disc = {
    name: `Disc_${equipId}`,
    image,
    level: eq.Level || 0,
    rarity: RARITY_MAP[storeEq.Rarity] || String(storeEq.Rarity || "?"),
    slot,
  };
  if (eq.MainStatList && eq.MainStatList.length > 0) {
    const main = eq.MainStatList[0];
    disc.mainStat = PROPERTY_MAP[main.PropertyId] || `stat_${main.PropertyId}`;
    disc.mainStatValue = main.PropertyValue || 0;
  }
  if (eq.RandomPropertyList && eq.RandomPropertyList.length > 0) {
    disc.substats = eq.RandomPropertyList.map((s) => ({
      stat: PROPERTY_MAP[s.PropertyId] || `stat_${s.PropertyId}`,
      value: s.PropertyValue || 0,
      rolls: s.PropertyLevel || 0,
    }));
  }
  return disc;
}

function calculateEquipmentStats(charData) {
  const stats = {};
  const addStat = (propId, value) => {
    const name = PROPERTY_MAP[propId];
    if (!name || !value) return;
    if (
      name.includes("percent") ||
      name.includes("rate") ||
      name.includes("dmg") ||
      name.includes("ratio") ||
      name.includes("regen")
    ) {
      stats[name] = (stats[name] || 0) + value;
    } else {
      stats[name] = (stats[name] || 0) + Math.floor(value);
    }
  };
  for (const equipped of charData.EquippedList || []) {
    const eq = equipped?.Equipment;
    if (!eq) continue;
    for (const stat of eq.MainStatList || [])
      addStat(stat.PropertyId, stat.PropertyValue);
    for (const stat of eq.RandomPropertyList || [])
      addStat(stat.PropertyId, stat.PropertyValue);
  }
  return stats;
}

function parseCharacter(charData, store) {
  const charId = charData.Id;
  const avatarStore = store.avatars[charId] || {};
  let name = avatarStore.Name || `Character_${charId}`;
  const localizedName = getLocalizedName(name, store);
  if (localizedName) name = localizedName;
  const image = buildImageUrl(avatarStore.Image);
  const elementTypes = avatarStore.ElementTypes || [];
  let element = "Unknown";
  if (elementTypes.length > 0) {
    const elemKey = elementTypes[0];
    element = ELEMENT_MAP[elemKey] || elemKey;
    if (
      element === "Unknown" ||
      element.includes("Zhen") ||
      element.includes("Auric")
    ) {
      element = avatarStore.ProfessionType || "Unknown";
    }
  }
  const rarity =
    RARITY_MAP[avatarStore.Rarity] || String(avatarStore.Rarity || "?");
  const mindscapeLevel = charData.TalentLevel || 0;
  const baseStats = calculateBaseStats(charData, avatarStore);
  const equipStats = calculateEquipmentStats(charData);
  const finalStats = { level: charData.Level || 1 };
  let hp = baseStats.hp + (equipStats.hp_base || 0) + (equipStats.hp_flat || 0);
  if (equipStats.hp_percent)
    hp = Math.floor(hp * (1 + equipStats.hp_percent / 10000));
  finalStats.hp = hp;
  let atk =
    baseStats.atk + (equipStats.atk_base || 0) + (equipStats.atk_flat || 0);
  if (equipStats.atk_percent)
    atk = Math.floor(atk * (1 + equipStats.atk_percent / 10000));
  finalStats.atk = atk;
  let def =
    baseStats.def + (equipStats.def_base || 0) + (equipStats.def_flat || 0);
  if (equipStats.def_percent)
    def = Math.floor(def * (1 + equipStats.def_percent / 10000));
  finalStats.def = def;
  finalStats.impact =
    baseStats.impact +
    (equipStats.impact || 0) +
    ((equipStats.impact_percent || 0) * atk) / 10000;
  finalStats.crit_rate =
    (baseStats.crit_rate * 10000 +
      (equipStats.crit_rate || 0) +
      (equipStats.crit_rate_flat || 0)) /
    10000;
  finalStats.crit_dmg =
    (baseStats.crit_dmg * 10000 +
      (equipStats.crit_dmg || 0) +
      (equipStats.crit_dmg_flat || 0)) /
    10000;
  finalStats.anomaly_mastery =
    baseStats.anomaly_mastery +
    (equipStats.anomaly_mastery || 0) +
    ((equipStats.anomaly_mastery_percent || 0) * baseStats.anomaly_mastery) /
      10000;
  finalStats.anomaly_proficiency =
    baseStats.anomaly_proficiency +
    (equipStats.anomaly_proficiency || 0) +
    (equipStats.anomaly_proficiency_flat || 0);
  finalStats.energy_regen =
    (baseStats.energy_regen * 10000 +
      (equipStats.energy_regen || 0) +
      (equipStats.energy_regen_percent || 0) +
      (equipStats.energy_regen_flat || 0)) /
    10000;
  finalStats.pen_ratio =
    ((equipStats.pen_ratio || 0) + (equipStats.pen_ratio_flat || 0)) / 10000;
  const dmgBonus = {};
  if (equipStats.physical_dmg_bonus || equipStats.physical_dmg_bonus_flat)
    dmgBonus.physical =
      (equipStats.physical_dmg_bonus || 0) +
      (equipStats.physical_dmg_bonus_flat || 0);
  if (equipStats.fire_dmg_bonus || equipStats.fire_dmg_bonus_flat)
    dmgBonus.fire =
      (equipStats.fire_dmg_bonus || 0) + (equipStats.fire_dmg_bonus_flat || 0);
  if (equipStats.ice_dmg_bonus || equipStats.ice_dmg_bonus_flat)
    dmgBonus.ice =
      (equipStats.ice_dmg_bonus || 0) + (equipStats.ice_dmg_bonus_flat || 0);
  if (equipStats.electric_dmg_bonus || equipStats.electric_dmg_bonus_flat)
    dmgBonus.electric =
      (equipStats.electric_dmg_bonus || 0) +
      (equipStats.electric_dmg_bonus_flat || 0);
  if (equipStats.ether_dmg_bonus || equipStats.ether_dmg_bonus_flat)
    dmgBonus.ether =
      (equipStats.ether_dmg_bonus || 0) +
      (equipStats.ether_dmg_bonus_flat || 0);
  if (Object.keys(dmgBonus).length > 0) finalStats.dmg_bonus = dmgBonus;
  const weapon = parseWeapon(charData.Weapon, store.weapons, store);
  const discs = [];
  for (const equipped of charData.EquippedList || []) {
    const disc = parseDisc(equipped, store.equipments, store);
    if (disc) discs.push(disc);
  }
  const skills = parseSkills(charData.SkillLevelList, mindscapeLevel);
  return {
    name,
    image,
    statistic: finalStats,
    element,
    rarity,
    mindscape_rank: mindscapeLevel,
    weapon,
    drive_discs: discs,
    skills,
  };
}

function httpGetRaw(url, timeout = 15000, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const cleanUrl = url.trim();
    const req = https.get(
      cleanUrl,
      { headers: { "User-Agent": "Mozilla/5.0" }, timeout },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
          const newUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, cleanUrl).href;
          return httpGetRaw(newUrl, timeout, maxRedirects - 1).then(
            resolve,
            reject,
          );
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) resolve(data);
          else reject(new Error(`HTTP ${res.statusCode}`));
        });
      },
    );
    req.on("error", (e) => reject(new Error(`Network error: ${e.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

async function fetchProfileAvatarImage(uid) {
  try {
    const html = await httpGetRaw(
      `https://enka.network/zzz/${uid}/`,
      10000,
    );
    const m = html.match(
      /avatar-icon.*?src="(\/ui\/zzz\/IconInterKnotRole[^"]+)"/,
    );
    return m ? `https://enka.network${m[1]}` : null;
  } catch {
    return null;
  }
}

async function parseProfile(playerInfo, apiData, store, avatarImageUrl) {
  const social = playerInfo.SocialDetail || playerInfo.socialDetail || {};
  const profile = social.ProfileDetail || {};
  const titleInfo = social.TitleInfo || {};
  const medals = social.MedalList || [];

  const parsedMedals = medals.map((m) => ({
    icon: m.MedalIcon,
    type: m.MedalType,
    value: m.Value,
    score: m.MedalScore,
  }));

  return {
    uid: profile.Uid || null,
    nickname: profile.Nickname || "Unknown",
    level: profile.Level || 0,
    desc: social.Desc || "",
    avatar_id: profile.AvatarId || null,
    avatar_image: avatarImageUrl,
    title: titleInfo.Title || profile.Title || null,
    full_title: titleInfo.FullTitle || null,
    title_args: titleInfo.Args || [],
    platform: profile.PlatformType || null,
    profile_id: profile.ProfileId || null,
    calling_card: profile.CallingCardId || null,
    medals: parsedMedals,
  };
}

async function scrapeZZZProfile(uid) {
  if (!/^\d+$/.test(uid)) {
    return {
      status: false,
      timestamp: new Date().toISOString(),
      error: "Invalid UID format. Must be numeric.",
    };
  }
  try {
    const storeData = await loadStoreFiles();
    const apiData = await httpGet(`https://enka.network/api/zzz/uid/${uid}`);
    const playerInfo = apiData.playerInfo || apiData.PlayerInfo;
    if (!playerInfo) throw new Error("Player not found or showcase is closed");
    const avatarList =
      playerInfo.ShowcaseDetail?.AvatarList ||
      playerInfo.showcaseDetail?.avatarList ||
      apiData.avatarInfoList ||
      [];
    if (!avatarList.length) throw new Error("No characters in showcase");
    const [avatarImageUrl] = await Promise.all([
      fetchProfileAvatarImage(uid),
    ]);
    const profile = await parseProfile(
      playerInfo,
      apiData,
      storeData,
      avatarImageUrl,
    );
    const characters = {};
    for (const charData of avatarList) {
      const parsed = parseCharacter(charData, storeData);
      characters[parsed.name || `Character_${charData.Id}`] = parsed;
    }
    return {
      status: true,
      timestamp: new Date().toISOString(),
      profile,
      agents: characters,
    };
  } catch (error) {
    return {
      status: false,
      timestamp: new Date().toISOString(),
      error: error.message || "Unknown error",
    };
  }
}

module.exports = {
  scrapeZZZProfile,
  parseProfile,
  loadStoreFiles,
  parseCharacter,
  httpGet,
  fetchProfileAvatarImage,
};
