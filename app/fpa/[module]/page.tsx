import { notFound } from "next/navigation";
import { MODULES, MODULE_BY_SLUG } from "@/lib/fpa/modules";
import ModuleView from "@/components/fpa/ModuleView";

export function generateStaticParams() {
  return MODULES.map((m) => ({ module: m.slug }));
}

export function generateMetadata({ params }: { params: { module: string } }) {
  const m = MODULE_BY_SLUG[params.module];
  return { title: m ? `${m.name} · NEXERA FP&A OS` : "NEXERA FP&A OS" };
}

export default function ModulePage({
  params,
}: {
  params: { module: string };
}) {
  const mod = MODULE_BY_SLUG[params.module];
  if (!mod) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {mod.name}
        </h1>
        <p className="mt-1 text-sm text-white/45">{mod.blurb}</p>
      </div>
      <ModuleView module={mod} />
    </div>
  );
}
