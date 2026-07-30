import { notFound } from "next/navigation";
import { getGamePayload } from "@/lib/data/puzzles";
import { EmojiGame } from "@/components/games/emoji/EmojiGame";

export default async function EmojiGamePage() {
  const payload = await getGamePayload("emoji");
  if (!payload) notFound();
  return <EmojiGame payload={payload} />;
}
