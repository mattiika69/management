import { redirect } from "next/navigation";

export default function HiddenMessagingSettingsPage() {
  redirect("/settings/integrations");
}
