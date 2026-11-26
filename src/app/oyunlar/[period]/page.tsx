import { notFound } from "next/navigation";
import { Calendar } from "../calendar";

export default async function Matches({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  if (period !== "bu-gun" && period !== "sabah" && period !== "gelecek") notFound();
  return <Calendar period={period} />;
}
