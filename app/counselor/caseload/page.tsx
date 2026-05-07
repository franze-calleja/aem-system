import { type Metadata } from "next";
import CounselorCaseload from "@/components/roles/counselor/caseload-panel";

export const metadata: Metadata = { title: "Caseload Dashboard — Counselor | AEM System" };

export default function CaseloadPage() {
  return <CounselorCaseload />;
}
