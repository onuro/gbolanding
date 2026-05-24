import type { Metadata } from "next";

import HomePage from "@/components/home-page";
import { getMessages } from "@/i18n/getMessages";
import { buildMetadata } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages("tr");
  return buildMetadata("tr", messages);
}

export default async function TurkishHomePage() {
  const messages = await getMessages("tr");
  return <HomePage locale="tr" messages={messages} />;
}
