import { type Metadata } from "next";
import CounselorNotes from "@/components/roles/counselor/notes-panel";

export const metadata: Metadata = { title: "Counseling Notes — Counselor | AEM System" };

export default function CounselorNotesPage() {
  return <CounselorNotes />;
}
