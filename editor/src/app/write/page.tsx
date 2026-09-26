import { Suspense } from "react";
import { Writer } from "@/components/studio/writer";

export default function WritePage() {
  return (
    <Suspense fallback={<p className="page-pad">Opening the page…</p>}>
      <Writer />
    </Suspense>
  );
}
