// Settings section: tabs for Team, Custom fields and Tags.

import Link from "next/link";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export default async function SettingsLayout({ children, params }: Props) {
  const { slug } = await params;
  const base = `/w/${slug}/settings`;
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-4 border-b text-sm" aria-label="Settings">
        <Link href={`${base}/team`} className="-mb-px border-b-2 border-transparent pb-2 text-muted-foreground hover:text-foreground">Team</Link>
        <Link href={`${base}/fields`} className="-mb-px border-b-2 border-transparent pb-2 text-muted-foreground hover:text-foreground">Custom fields</Link>
        <Link href={`${base}/tags`} className="-mb-px border-b-2 border-transparent pb-2 text-muted-foreground hover:text-foreground">Tags</Link>
      </nav>
      {children}
    </div>
  );
}
