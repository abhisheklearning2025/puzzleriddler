import { notFound } from "next/navigation";
import { getGamePayload } from "@/lib/data/puzzles";
import { DingbatsGame } from "@/components/games/dingbats/DingbatsGame";

export default async function DingbatsGamePage() {
  const payload = await getGamePayload("dingbats");
  if (!payload) notFound();
  return <DingbatsGame payload={payload} />;
}
