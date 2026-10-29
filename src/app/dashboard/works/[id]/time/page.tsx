import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { database, getAsset } from '@/lib/db';
import TimeClaimEditor from '@/components/time-claim-editor';
import type { TimeClaimVersion } from '@/lib/time-claims';
import { uuid } from '@/lib/validation';

export const metadata: Metadata = { title: 'Quản lý thời gian tác phẩm', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function WorkTimeClaims({ params }: { params: Promise<{ id: string }> }) {
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const asset = await getAsset(parsed.data).catch(() => null);
  if (!asset) notFound();

  const sql = database();
  const history = (await sql`
    SELECT * FROM asset_time_claim_versions
    WHERE asset_id = ${asset.id}::uuid ORDER BY version DESC LIMIT 100
  `) as TimeClaimVersion[];

  return <>
    <div className="dashboard-top">
      <div>
        <Link href="/dashboard" className="minor-link"><ArrowLeft size={16}/> Quay lại Dashboard</Link>
        <div className="kicker" style={{ marginTop: 20 }}>OWNER-DECLARED TIME CLAIMS</div>
        <h1>Thời gian <i>tác phẩm.</i></h1>
        <p>{asset.title} — chỉnh sửa khai báo, giữ nguyên lịch sử chứng cứ.</p>
      </div>
    </div>
    <TimeClaimEditor asset={asset} history={history}/>
  </>;
}
