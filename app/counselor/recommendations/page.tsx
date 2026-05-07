import { type Metadata } from "next";
import CounselorRecommendations from "@/components/roles/counselor/recommendations-panel";

export const metadata: Metadata = { title: "Recommendations — Counselor | AEM System" };

export default function CounselorRecommendationsPage() {
  return <CounselorRecommendations />;
}
