import { type Metadata } from "next";
import CounselorPatterns from "@/components/roles/counselor/patterns-panel";

export const metadata: Metadata = { title: "Pattern Alerts — Counselor | AEM System" };

export default function CounselorPatternsPage() {
  return <CounselorPatterns />;
}
