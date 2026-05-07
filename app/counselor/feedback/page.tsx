import { type Metadata } from "next";
import CounselorFeedback from "@/components/roles/counselor/feedback-panel";

export const metadata: Metadata = { title: "Feedback Queue — Counselor | AEM System" };

export default function CounselorFeedbackPage() {
  return <CounselorFeedback />;
}
