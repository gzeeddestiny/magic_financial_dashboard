import { getProjectProfitability, getProjectFilterOptions, type DateRange } from "@/actions/dashboard";
import { ProjectsView } from "@/components/dashboard/projects-view";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range: DateRange | undefined =
    sp.from && sp.to ? { from: sp.from, to: sp.to } : undefined;

  const [projects, filterOptions] = await Promise.all([
    getProjectProfitability(range),
    getProjectFilterOptions(),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project & Client Profitability</h1>
        <p className="text-base text-muted-foreground mt-1">
          เจาะลึกกำไรรายโปรเจกต์ — ตอบคำถาม &quot;ควรเลิกรับงานประเภทไหน?&quot;
        </p>
      </div>

      <ProjectsView
        data={projects}
        types={filterOptions.types}
        pms={filterOptions.pms}
      />
    </div>
  );
}
