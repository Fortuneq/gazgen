/** Maps tag names to human-readable Russian display names */
const TAG_DISPLAY: Record<string, string> = {
  male: "Мужское",
  female: "Женское",
  couple: "Пары",
  group: "Группа",
  landscape: "Пейзажи",
  object: "Объекты",
  animal: "Животные",
  anime: "Аниме",
  abstract: "Абстракция",
  fashion: "Мода",
  portrait: "Портреты",
  fullbody: "В полный рост",
};

/** Legacy: Maps backend model-based category names to human-readable display names */
const CATEGORY_DISPLAY: Record<string, string> = {
  nano_banana_2: "Nano Banana 2",
  text2image_soul: "Soul Art",
  seedream_v4_5: "Seedream 4.5",
  ai_influencer: "Инфлюенсер",
  flux_2: "Flux 2",
  cinematic_studio_image: "Кинематограф",
  kling_omni_image: "Kling Omni",
  text2keyframes: "Кейфреймы",
  seedream: "Seedream",
  nano_banana: "Nano Banana",
  text2image_soul_v2: "Soul Art v2",
  z_image: "Z Image",
  openai_hazel: "Hazel",
  canvas_soul: "Canvas Soul",
  text2image_gpt: "GPT Image",
  nano_banana_pro: "Nano Banana Pro",
  nano_strawberry: "Strawberry",
  nano_peach: "Peach",
  nano_mango: "Mango",
  nano_kiwi: "Kiwi",
  nano_cherry: "Cherry",
  nano_lemon: "Lemon",
  nano_grape: "Grape",
  nano_melon: "Melon",
  nano_orange: "Orange",
  nano_pineapple: "Pineapple",
};

export function getTagDisplayName(tag: string): string {
  return TAG_DISPLAY[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function getCategoryDisplayName(raw: string): string {
  if (CATEGORY_DISPLAY[raw]) return CATEGORY_DISPLAY[raw];
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
