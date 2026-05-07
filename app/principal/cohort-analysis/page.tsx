import { type Metadata } from "next";
import PrincipalCohort from "@/components/roles/principal/cohort-panel";
export const metadata: Metadata = { title: "Cohort Analysis — Principal | AEM System" };
export default function CohortPage() { return <PrincipalCohort />; }
