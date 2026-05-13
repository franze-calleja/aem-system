"use client";

import { Suspense } from "react";
import InterventionBuilder from "@/components/roles/counselor/intervention-builder";

export default function InterventionsPage() {
  return (
    <Suspense>
      <InterventionBuilder />
    </Suspense>
  );
}
