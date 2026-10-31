import { notFound } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";

// Placeholder for sections that haven't been built yet. Real routes replace this per section.
export default async function SectionPlaceholder({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.path === section);
  if (!item) notFound();

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-10">
      <item.icon className="size-6 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{item.title}</h2>
      <p className="text-sm text-muted-foreground">This arrives in the {item.phase} phase of the build plan.</p>
    </div>
  );
}
