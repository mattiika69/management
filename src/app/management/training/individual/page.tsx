import { TrainingRoutePage } from "../training-route-page";

export default async function IndividualTrainingPage() {
  return TrainingRoutePage({ active: "/management/training/individual", title: "Individual" });
}
