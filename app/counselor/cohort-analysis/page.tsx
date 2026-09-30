import { requireRole } from "@/lib/session";
import CohortAnalysisView, {
  type CohortSearchParams,
} from "@/components/roles/shared/cohort-analysis-view";

export default async function CounselorCohortAnalysisPage({
  searchParams,
}: {
  // Next 16: searchParams is async.
  searchParams: Promise<CohortSearchParams>;
}) {
  await requireRole("COUNSELOR");
  return <CohortAnalysisView basePath="/counselor/cohort-analysis" params={await searchParams} />;
}
