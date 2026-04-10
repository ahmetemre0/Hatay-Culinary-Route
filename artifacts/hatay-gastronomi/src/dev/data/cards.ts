export type MaterialType =
  | "Et" | "Sebze" | "Ekmek" | "ZeytinYagi" | "Ates"
  | "Nohut" | "NarEksisi" | "Seker" | "Meyve" | "Sos"
  | "Tahin" | "Peynir" | "Dondurma" | "Patates" | "Bulgur" | "Bakliyat"
  | "Joker";

export type FoodCard = {
  id: string; type: "food";
  name: string;
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
  | "draw_two" | "trade_two" | "block_region" | "multiply_points"
  | "multiply_lowest_points" | "collect_all_meat" | "refresh_orders"
  | "instant_points" | "swap_all_cards";

export type EventCard = {
  id: string; type: "event";
  effectName: string; description: string;
  action: EventCardAction; emoji: string; color: string;
};

export type Card = FoodCard | MaterialCard | EventCard;

const FOOD_TEMPLATES: Omit<FoodCard, "id" | "type">[] = [
  { name: "Sürki", requiredMaterials: ["ZeytinYagi", "Peynir"], points: 3, emoji: "🧀", color: "from-yellow-400 to-amber-600" },
  { name: "Haytalı", requiredMaterials: ["Seker", "Dondurma"], points: 5, emoji: "🍨", color: "from-pink-400 to-rose-600" },
  { name: "Yayladağı Lokumu", requiredMaterials: ["Seker", "Meyve"], points: 4, emoji: "🍬", color: "from-pink-500 to-purple-600" },
  //{ name: "Halka Tatlı", requiredMaterials: ["Ekmek", "Seker"], points: 4, emoji: "🍩", color: "from-amber-400 to-orange-600" },
  { name: "Oruk", requiredMaterials: ["Et", "Bakliyat"], points: 3, emoji: "🧆", color: "from-amber-600 to-amber-800" },
  { name: "Kaytaz", requiredMaterials: ["Et", "Ekmek"], points: 3, emoji: "🥐", color: "from-orange-500 to-amber-700" },
  { name: "Harbiye Kebap", requiredMaterials: ["Et", "Sebze", "Ekmek"], points: 5, emoji: "🍖", color: "from-red-600 to-red-800" },
  { name: "Humus", requiredMaterials: ["ZeytinYagi", "Bakliyat", "Tahin"], points: 6, emoji: "🫘", color: "from-yellow-500 to-amber-700" },
  { name: "Zeytin Salatası", requiredMaterials: ["ZeytinYagi", "NarEksisi", "Meyve"], points: 6, emoji: "🫒", color: "from-green-600 to-green-800" },
  //{ name: "Mercimekli Bulgur", requiredMaterials: ["Sebze", "ZeytinYagi", "Bulgur"], points: 7, emoji: "🌾", color: "from-amber-500 to-amber-700" },
  { name: "Katıklı", requiredMaterials: ["Ekmek", "Ates", "Peynir"], points: 6, emoji: "🫙", color: "from-slate-400 to-slate-600" },
  //{ name: "Kırıkhan Ciğeri", requiredMaterials: ["Et", "Ates", "Sos"], points: 7, emoji: "🥩", color: "from-red-700 to-red-900" },
  { name: "Kabak Tatlısı", requiredMaterials: ["Seker", "Meyve", "Tahin"], points: 7, emoji: "🎃", color: "from-orange-400 to-amber-600" },
  { name: "Künefe", requiredMaterials: ["Seker", "Peynir", "Dondurma"], points: 9, emoji: "🍯", color: "from-amber-300 to-amber-500" },
  { name: "Fellah Köftesi", requiredMaterials: ["Sebze", "Sos", "Bakliyat"], points: 5, emoji: "🫕", color: "from-red-500 to-red-700" },
  { name: "Belen Tava", requiredMaterials: ["Et", "Sebze", "Ates"], points: 4, emoji: "🍳", color: "from-orange-600 to-red-700" },
  { name: "Kağıt Kebabı", requiredMaterials: ["Et", "Sebze", "Ekmek", "Ates"], points: 7, emoji: "📜", color: "from-red-600 to-amber-700" },
  { name: "Tepsi Kebabı", requiredMaterials: ["Et", "Sebze", "Ates", "Sos"], points: 8, emoji: "🥘", color: "from-red-700 to-red-900" },
  { name: "Hatay Döner", requiredMaterials: ["Et", "Ekmek", "Sos", "Sebze"], points: 8, emoji: "🥙", color: "from-orange-600 to-red-800" },
  { name: "Babagannuş", requiredMaterials: ["Sebze", "ZeytinYagi", "Ates", "NarEksisi"], points: 8, emoji: "🍆", color: "from-purple-600 to-purple-800" },
  { name: "Sarmaiçi", requiredMaterials: ["Sebze", "ZeytinYagi", "NarEksisi", "Bakliyat"], points: 8, emoji: "🥗", color: "from-green-500 to-green-700" },
  { name: "Bakla", requiredMaterials: ["Sebze", "ZeytinYagi", "Bakliyat", "Tahin"], points: 8, emoji: "🫛", color: "from-green-600 to-emerald-800" },
  //{ name: "Patates Köftesi", requiredMaterials: ["NarEksisi", "ZeytinYagi", "Sebze", "Bakliyat"], points: 8, emoji: "🫕", color: "from-amber-700 to-amber-900" },
];

const MATERIAL_TEMPLATES: { materialType: MaterialType; name: string; emoji: string; color: string; count: number }[] = [
  { materialType: "Et", name: "Et", emoji: "🥩", color: "from-red-400 to-red-600", count: 7 },
  { materialType: "Sebze", name: "Sebze", emoji: "🥦", color: "from-green-400 to-green-600", count: 9 },
  { materialType: "Ekmek", name: "Ekmek", emoji: "🫓", color: "from-yellow-300 to-yellow-500", count: 5 },
  { materialType: "ZeytinYagi", name: "Zeytin Yağı", emoji: "🫙", color: "from-lime-500 to-green-700", count: 6 },
  { materialType: "Ates", name: "Ateş", emoji: "🔥", color: "from-orange-400 to-red-500", count: 5 },
  { materialType: "Nohut", name: "Nohut", emoji: "🫛", color: "from-amber-300 to-amber-500", count: 0 },
  { materialType: "NarEksisi", name: "Nar Ekşisi", emoji: "🍷", color: "from-purple-400 to-purple-600", count: 3 },
  { materialType: "Seker", name: "Şeker", emoji: "🍚", color: "from-pink-200 to-pink-400", count: 4 },
  { materialType: "Meyve", name: "Meyve", emoji: "🍎", color: "from-red-300 to-orange-400", count: 3 },
  { materialType: "Sos", name: "Sos", emoji: "🌶️", color: "from-red-500 to-red-700", count: 3 },
  { materialType: "Tahin", name: "Tahin", emoji: "🥜", color: "from-amber-200 to-amber-400", count: 3 },
  { materialType: "Peynir", name: "Peynir", emoji: "🧀", color: "from-yellow-200 to-yellow-400", count: 3 },
  { materialType: "Dondurma", name: "Dondurma", emoji: "🍦", color: "from-sky-200 to-blue-300", count: 2 },
  { materialType: "Patates", name: "Patates", emoji: "🥔", color: "from-amber-300 to-amber-500", count: 0 },
  { materialType: "Bakliyat", name: "Bakliyat", emoji: "🌾", color: "from-stone-400 to-stone-600", count: 5 },
  { materialType: "Bulgur", name: "Bulgur", emoji: "🌾", color: "from-stone-400 to-stone-600", count: 0 },
  { materialType: "Joker", name: "Vakıflı Sepeti (Joker)", emoji: "🧺", color: "from-violet-400 to-violet-600", count: 4 },
];

const EVENT_TEMPLATES: Omit<EventCard, "id" | "type">[] = [
  { effectName: "Samandağ Biberi", description: "Bir rakibin bu tur atlamasına neden ol!", action: "skip_turn", emoji: "🌶️", color: "from-red-600 to-red-800" },
  { effectName: "Asi Nehri Taştı", description: "Herkes elindeki tüm kartları desteye koyup yeniden çeker. Desteyi karıştırmayı unutmayın!", action: "reshuffle_all", emoji: "🌊", color: "from-blue-400 to-blue-700" },
  { effectName: "Misafirperverlik", description: "Bir rakibinden rastgele 1 kart çek.", action: "steal_card", emoji: "🤝", color: "from-teal-400 to-teal-600" },
  { effectName: "Bereketli Topraklar", description: "Desteden fazladan 2 kart çek.", action: "draw_two", emoji: "🌿", color: "from-green-500 to-green-700" },
  { effectName: "Esnaf Dayanışması", description: "Bir oyuncunun rastgele 2 kartıyla kendi 2 kartını takas et.", action: "trade_two", emoji: "🏪", color: "from-yellow-500 to-yellow-700" },
  { effectName: "Sıcak Hava Dalgası", description: "Vantilatörün olması iyi olmuş. Sen hariç tüm oyuncular bir sonraki tur sipariş tamamlayamaz.", action: "block_region", emoji: "☀️", color: "from-orange-400 to-yellow-500" },
  { effectName: "Saray Caddesine Taşındık", description: "Yemeğin değer kazandı. Sipariş penceresindeki bir yemeğin puanını 2 ile çarp!", action: "multiply_points", emoji: "🏰", color: "from-amber-400 to-amber-600" },
  { effectName: "Memleket Hasreti", description: "Tamamladığın siparişler arasından en düşük puanlı yemeğin puanını ikiye katla.", action: "multiply_lowest_points", emoji: "🏡", color: "from-sky-500 to-blue-700" },
  { effectName: "Etobur", description: "Canın mangal çekti herhalde. Herkes elindeki Et kartlarını sana verir.", action: "collect_all_meat", emoji: "🥩", color: "from-red-500 to-red-700" },
  { effectName: "Araktini Kafa Yaptı", description: "Şefin yemek yaparken içme diye kaç defa kızacak sana. Sipariş penceresi tamamen yenilenir.", action: "refresh_orders", emoji: "🍾", color: "from-indigo-500 to-violet-700" },
  { effectName: "Yeruhe Kalbek", description: "Evde en sevdiğin yemek pişiyor. 3 puan kazan!", action: "instant_points", emoji: "💝", color: "from-pink-500 to-rose-700" },
  { effectName: "Cınno Nıtto", description: "Ortalık iyice karışır. Bir oyuncuyla elinizdeki tüm kartları takas edersiniz.", action: "swap_all_cards", emoji: "🔄", color: "from-teal-500 to-cyan-700" },
];

const EVENT_COUNTS: Record<string, number> = {
  "Samandağ Biberi": 0, "Asi Nehri Taştı": 2, Misafirperverlik: 4,
  "Bereketli Topraklar": 3, "Esnaf Dayanışması": 3, "Sıcak Hava Dalgası": 4,
  "Saray Caddesine Taşındık": 2, "Memleket Hasreti": 2, Etobur: 2,
  "Araktini Kafa Yaptı": 2, "Yeruhe Kalbek": 3, "Cınno Nıtto": 2,
};

function buildFoodDeck(): FoodCard[] {
  return FOOD_TEMPLATES.map((tmpl, i) => ({
    ...tmpl,
    id: `food-${i}`,
    type: "food" as const,
  }));
}

function buildMaterialDeck(): MaterialCard[] {
  const deck: MaterialCard[] = [];
  let idx = 0;
  for (const tmpl of MATERIAL_TEMPLATES) {
    for (let i = 0; i < tmpl.count; i++) {
      deck.push({
        id: `material-${idx++}`,
        type: "material",
        materialType: tmpl.materialType,
        name: tmpl.name,
        emoji: tmpl.emoji,
        color: tmpl.color,
      });
    }
  }
  return deck;
}

function buildEventDeck(): EventCard[] {
  const deck: EventCard[] = [];
  let idx = 0;
  for (const tmpl of EVENT_TEMPLATES) {
    const count = EVENT_COUNTS[tmpl.effectName] ?? 1;
    for (let i = 0; i < count; i++) {
      deck.push({ ...tmpl, id: `event-${idx++}`, type: "event" });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildInitialDecks() {
  const foodDeck = shuffle(buildFoodDeck());
  const materialEventDeck = shuffle([...buildMaterialDeck(), ...buildEventDeck()]);
  return { foodDeck, materialEventDeck };
}
