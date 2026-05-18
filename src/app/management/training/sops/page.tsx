import { TrainingRoutePage } from "../training-route-page";

export default async function SopsPage() {
  return TrainingRoutePage({ active: "/management/training/sops", title: "SOPs" });
}
