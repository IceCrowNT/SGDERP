import { db } from '@/lib/db';
import { officeActor, officeSource } from '@/lib/office-access';
import { readOfficeSession } from '@/lib/office-editor';
import { readAttachmentBytes } from '@/lib/ai-attachment-storage';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const data = await readOfficeSession(new URL(request.url).searchParams.get('ticket') || '', 'source'), actor = await officeActor(data);
    const file = await db.$transaction(tx => officeSource(tx, data, actor));
    const bytes = await readAttachmentBytes(file.khoa_luu_tru);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.ten_tep).replace(/'/g, '%27')}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
  } catch { return new Response('Tệp không khả dụng.', { status: 404, headers: { 'Cache-Control': 'no-store' } }); }
}
