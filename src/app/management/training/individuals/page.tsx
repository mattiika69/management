import { TrainingRoutePage } from "../training-route-page";

export default async function IndividualsTrainingPage() {
  return TrainingRoutePage({ active: "/management/training/individuals", title: "Individuals" });
}
