import { TrainingRoutePage } from "./training-route-page";

export default async function ManagementTrainingPage() {
  return TrainingRoutePage({ active: "/management/training", title: "Onboarding" });
}
