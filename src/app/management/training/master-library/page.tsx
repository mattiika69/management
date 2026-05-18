import { TrainingRoutePage } from "../training-route-page";

export default async function MasterLibraryPage() {
  return TrainingRoutePage({ active: "/management/training/master-library", title: "Master Library" });
}
