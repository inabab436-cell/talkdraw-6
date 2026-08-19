import kai from "@/assets/char-kai.jpg";
import ren from "@/assets/char-ren.jpg";
import sora from "@/assets/char-sora.jpg";
import akira from "@/assets/char-akira.jpg";

export type Character = {
  id: string;
  name: string;
  title: string;
  tagline: string;
  traits: string[];
  image: string;
  voiceId: string;
};

export const characters: Character[] = [
  {
    id: "kai",
    name: "Kai",
    title: "The Night Strategist",
    tagline: "Composed, sharp and always three moves ahead of the conversation.",
    traits: ["Analytical", "Loyal", "Dry humor"],
    image: kai,
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
  },
  {
    id: "ren",
    name: "Ren",
    title: "The Gilded Rival",
    tagline: "Confident and charming, he turns every talk into a friendly duel.",
    traits: ["Bold", "Playful", "Competitive"],
    image: ren,
    voiceId: "IKne3meq5aSn9XLyUdCD",
  },
  {
    id: "sora",
    name: "Sora",
    title: "The Quiet Scholar",
    tagline: "Patient listener with an archive of stories waiting to be told.",
    traits: ["Calm", "Thoughtful", "Curious"],
    image: sora,
    voiceId: "N2lVS1w4EtoT3dr4eOWO",
  },
  {
    id: "akira",
    name: "Akira",
    title: "The Spark",
    tagline: "Endless energy, terrible at sitting still, great at cheering you up.",
    traits: ["Energetic", "Warm", "Impulsive"],
    image: akira,
    voiceId: "iP95p4xoKVk53GoZ742B",
  },
];
