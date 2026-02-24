import { NextResponse } from "next/server";

export type Voice = {
  voice_id: string;
  name: string;
  gender: "female" | "male";
  description: string;
  preview_url?: string;
  tag?: string;
};

const CURATED_VOICES: Voice[] = [
  // ── Ukrainian native voices (from ElevenLabs shared library) ──
  {
    voice_id: "U4IxWQ3B5B0suleGgLcn",
    name: "Катерина",
    gender: "female",
    description: "Поточний голос — теплий, дружелюбний",
    tag: "default",
  },
  {
    voice_id: "Bn2Tw7ruLKdtFQ6xcEkG",
    name: "Євгенія",
    gender: "female",
    description: "Теплий та яскравий, для наративу",
    preview_url:
      "https://storage.googleapis.com/eleven-public-prod/database/user/user_6601kfzh5qxme6h89sxbb9x4ft6p/voices/Bn2Tw7ruLKdtFQ6xcEkG/0105813b-ab10-4e76-ad15-7cae0cb492dd.mp3",
  },
  {
    voice_id: "Xx7Usst6zGAQKLjgeyV7",
    name: "Катерина Бойко",
    gender: "female",
    description: "Золотистий та чарівний",
    preview_url:
      "https://storage.googleapis.com/eleven-public-prod/database/workspace/d5002beb903e4e3193d9d182a909f5f0/voices/Xx7Usst6zGAQKLjgeyV7/v5z5Y8sxRlL8CrPPrrvq.mp3",
  },
  {
    voice_id: "yMBZR4SLoc24wOJLWAB2",
    name: "Соломія",
    gender: "female",
    description: "Подкаст-стиль, невимушений",
    preview_url:
      "https://storage.googleapis.com/eleven-public-prod/database/workspace/daacdc8e586047ae9a41283f732bb029/voices/yMBZR4SLoc24wOJLWAB2/VFLStdl3CABVf7cQLUBq.mp3",
  },

  // ── ElevenLabs premade multilingual voices ──
  {
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    name: "Раїса",
    gender: "female",
    description: "Спокійний, врівноважений",
  },
  {
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    name: "Сара",
    gender: "female",
    description: "М'який, новинний стиль",
  },
  {
    voice_id: "N2lVS1w4EtoT3dr4eOWO",
    name: "Тарас",
    gender: "male",
    description: "Хрипкий, впевнений",
  },
  {
    voice_id: "JBFqnCBsd6RMkjVDRZzb",
    name: "Георгій",
    gender: "male",
    description: "Теплий, привітний",
  },
  {
    voice_id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Олексій",
    gender: "male",
    description: "Чіткий, артикульований",
  },
  {
    voice_id: "pqHfZKP75CvOlQylNhV4",
    name: "Богдан",
    gender: "male",
    description: "Надійний, довірливий",
  },
  {
    voice_id: "IKne3meq5aSn9XLyUdCD",
    name: "Андрій",
    gender: "male",
    description: "Невимушений, легкий",
  },
  {
    voice_id: "CYw3kZ02Hs0563khs1Fj",
    name: "Давид",
    gender: "male",
    description: "Спокійний, наративний",
  },
];

export async function GET() {
  return NextResponse.json({ voices: CURATED_VOICES });
}
