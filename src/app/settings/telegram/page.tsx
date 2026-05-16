import { redirect } from "next/navigation";

export default function TelegramSettingsPage() {
  redirect("/settings/integrations#telegram");
}
