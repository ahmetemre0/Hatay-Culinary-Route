export type MaterialType =
  | "Et" | "Sebze" | "Ekmek" | "Zeytinyagi" | "Ates"
  | "Nohut" | "NarEksisi" | "Seker" | "Meyve" | "Sos" | "Joker";

export type RegionCard = {
  id: string; type: "region";
  name: string; district: string; dish: string;
  requiredMaterials: MaterialType[]; points: number;
  emoji: string; color: string;
};

export type MaterialCard = {
  id: string; type: "material";
  materialType: MaterialType; name: string;
  emoji: string; color: string;
};

export type EventCardAction =
  | "skip_turn" | "steal_card" | "reshuffle_all"
  | "draw_two" | "trade_two" | "block_region" | "multiply_points";

export type EventCard = {
  id: string; type: "event";
  effectName: string; description: string;
  action: EventCardAction; emoji: string; color: string;
};

export type Card = RegionCard | MaterialCard | EventCard;

const REGION_TEMPLATES: Omit<RegionCard, "id" | "type">[] = [
  { name: "Antakya", district: "Antakya", dish: "Tepsi Kebabı", requiredMaterials: ["Et", "Sebze", "Ates"], points: 10, emoji: "🍖", color: "from-red-700 to-red-900" },
  { name: "İskenderun", district: "İskenderun", dish: "Döner", requiredMaterials: ["Et", "Ekmek", "Sos"], points: 8, emoji: "🥙", color: "from-orange-600 to-orange-800" },
  { name: "Samandağ", district: "Samandağ", dish: "Humus", requiredMaterials: ["Nohut", "Nohut", "Zeytinyagi"], points: 7, emoji: "🫘", color: "from-yellow-600 to-yellow-800" },
  { name: "Altınözü", district: "Altınözü", dish: "Zeytin Salatası", requiredMaterials: ["Zeytinyagi", "NarEksisi", "Sebze"], points: 6, emoji: "🫒", color: "from-green-600 to-green-800" },
  { name: "Yayladağı", district: "Yayladağı", dish: "Lokum", requiredMaterials: ["Seker", "Meyve", "Seker"], points: 5, emoji: "🍬", color: "from-pink-500 to-pink-700" },
  { name: "Kırıkhan", district: "Kırıkhan", dish: "Tatlı Kavun", requiredMaterials: ["Meyve", "Meyve", "Seker"], points: 4, emoji: "🍈", color: "from-lime-500 to-lime-700" },
  { name: "Arsuz", district: "Arsuz", dish: "Balık Ekmeği", requiredMaterials: ["Sebze", "Ekmek", "Sos"], points: 8, emoji: "🐟", color: "from-blue-500 to-blue-700" },
  { name: "Dörtyol", district: "Dörtyol", dish: "Narenciye Tabağı", requiredMaterials: ["Meyve", "Meyve"], points: 3, emoji: "🍊", color: "from-orange-400 to-orange-600" },
  { name: "Belen", district: "Belen", dish: "Tava", requiredMaterials: ["Et", "Ates", "Zeytinyagi"], points: 9, emoji: "🍳", color: "from-amber-600 to-amber-800" },
];

const COUNTS: Record<string, number> = {
  Antakya: 3, İskenderun: 3, Samandağ: 3, Altınözü: 3, Yayladağı: 3,
  Kırıkhan: 3, Arsuz: 3, Dörtyol: 2, Belen: 2,
};

const MATERIAL_TEMPLATES: { materialType: MaterialType; name: string; emoji: string; color: string; count: number }[] = [
  { materialType: "Et", name: "Et (Kıyma/Kuşbaşı)", emoji: "🥩", color: "from-red-400 to-red-600", count: 8 },
  { materialType: "Sebze", name: "Sebze (Biber/Domates)", emoji: "🥦", color: "from-green-400 to-green-600", count: 7 },
  { materialType: "Ekmek", name: "Ekmek (Lavaş/Tırnaklı)", emoji: "🫓", color: "from-yellow-300 to-yellow-500", count: 6 },
  { materialType: "Zeytinyagi", name: "Zeytinyağı / Zeytin", emoji: "🫙", color: "from-green-500 to-green-700", count: 6 },
  { materialType: "Ates", name: "Ateş (Pişirme Gücü)", emoji: "🔥", color: "from-orange-400 to-red-500", count: 5 },
  { materialType: "Nohut", name: "Nohut / Tahin", emoji: "🫛", color: "from-amber-300 to-amber-500", count: 5 },
  { materialType: "NarEksisi", name: "Nar Ekşisi / Kekik", emoji: "🍷", color: "from-purple-400 to-purple-600", count: 5 },
  { materialType: "Seker", name: "Şeker / Nişasta", emoji: "🍚", color: "from-pink-200 to-pink-400", count: 4 },
  { materialType: "Meyve", name: "Meyve / Narenciye", emoji: "🍎", color: "from-red-300 to-orange-400", count: 4 },
  { materialType: "Sos", name: "Sos / Baharat", emoji: "🌶️", color: "from-red-500 to-red-700", count: 3 },
  { materialType: "Joker", name: "Vakıflı Sepeti (Joker)", emoji: "🧺", color: "from-violet-400 to-violet-600", count: 2 },
];

const EVENT_TEMPLATES: Omit<EventCard, "id" | "type">[] = [
  { effectName: "Samandağ Biberi", description: "Bir rakibin bu turki atlamasına neden ol!", action: "skip_turn", emoji: "🌶️", color: "from-red-600 to-red-800" },
  { effectName: "Asi Nehri Taştı", description: "Herkes elindeki tüm kartları desteye koyup yeniden çeker.", action: "reshuffle_all", emoji: "🌊", color: "from-blue-400 to-blue-700" },
  { effectName: "Misafirperverlik", description: "Bir rakibinden rastgele 1 kart çek.", action: "steal_card", emoji: "🤝", color: "from-teal-400 to-teal-600" },
  { effectName: "Bereketli Topraklar", description: "Desteden fazladan 2 kart çek.", action: "draw_two", emoji: "🌿", color: "from-green-500 to-green-700" },
  { effectName: "Esnaf Dayanışması", description: "Başka bir oyuncuyla elindeki 2 kartı açıkça takas et.", action: "trade_two", emoji: "🏪", color: "from-yellow-500 to-yellow-700" },
  { effectName: "Sıcak Hava Dalgası", description: "Tüm oyuncular bir sonraki tur bölge tamamlayamaz.", action: "block_region", emoji: "☀️", color: "from-orange-400 to-yellow-500" },
  { effectName: "Künefe Şöleni", description: "Ortadaki bir bölgenin puanını 2 ile çarp!", action: "multiply_points", emoji: "🧁", color: "from-amber-400 to-amber-600" },
];

const EVENT_COUNTS: Record<string, number> = {
  "Samandağ Biberi": 4, "Asi Nehri Taştı": 3, Misafirperverlik: 3,
  "Bereketli Topraklar": 3, "Esnaf Dayanışması": 3, "Sıcak Hava Dalgası": 2, "Künefe Şöleni": 2,
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildInitialDecks() {
  const regionDeck: RegionCard[] = [];
  let ri = 0;
  for (const tmpl of REGION_TEMPLATES) {
    const count = COUNTS[tmpl.district] ?? 1;
    for (let i = 0; i < count; i++) regionDeck.push({ ...tmpl, id: `region-${ri++}`, type: "region" });
  }

  const materialEventDeck: Card[] = [];
  let mi = 0;
  for (const t of MATERIAL_TEMPLATES) {
    for (let i = 0; i < t.count; i++) {
      materialEventDeck.push({ id: `material-${mi++}`, type: "material", materialType: t.materialType, name: t.name, emoji: t.emoji, color: t.color });
    }
  }
  let ei = 0;
  for (const t of EVENT_TEMPLATES) {
    const count = EVENT_COUNTS[t.effectName] ?? 1;
    for (let i = 0; i < count; i++) {
      materialEventDeck.push({ id: `event-${ei++}`, type: "event", effectName: t.effectName, description: t.description, action: t.action, emoji: t.emoji, color: t.color });
    }
  }

  return { regionDeck: shuffle(regionDeck), materialEventDeck: shuffle(materialEventDeck) };
}
