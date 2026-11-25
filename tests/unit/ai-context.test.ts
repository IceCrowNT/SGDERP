import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryChunks, compactText, chatContext } from '../../src/lib/ai-chat-server';
import { ChatMetadataSchema } from '../../src/lib/ai-chat';
import { AiChatSchema } from '../../src/lib/ai-pilot';
import type { tin_nhan_ai } from '@prisma/client';

test('compaction fragments preserve Vietnamese, emoji, quotes and exact source text', () => {
  const source = 'Tiếng Việt 🧑‍💻 "2 dây HDMI"\n'.repeat(5000);
  const chunks = memoryChunks(source);
  assert(chunks.length > 1); assert.equal(chunks.join(''), source);
  assert(chunks.every(c => Buffer.byteLength(c, 'utf8') <= 64000));
  assert(!chunks.some(c => c.includes('\ufffd')));
  const input = compactText([{ image_url: 'data:image/png;base64,PRIVATE_BYTES', encrypted_content: 'ENCRYPTED', text: 'Giữ văn bản' }]);
  assert(!input.includes('PRIVATE_BYTES')); assert(!input.includes('ENCRYPTED')); assert(input.includes('Giữ văn bản'));
});

test('history does not silently drop the thirteenth turn, failed facts or provenance', () => {
  const base = { company_id: 1, hoi_thoai_id: 1, ma_xu_ly: null, het_han_xu_ly: null, created_at: new Date(0), updated_at: new Date(0), du_lieu_kem_theo: null };
  const rows: tin_nhan_ai[] = Array.from({length: 20}, (_, i) => [
    { ...base, id: i * 2 + 1, ma_yeu_cau: String(i), vai_tro: 'NGUOI_DUNG', noi_dung: `FACT-${i}`, trang_thai: 'HOAN_TAT' },
    { ...base, id: i * 2 + 2, ma_yeu_cau: String(i), vai_tro: 'TRO_LY', noi_dung: 'Kết quả', trang_thai: i === 19 ? 'LOI' : 'HOAN_TAT', du_lieu_kem_theo: { version: 1, ngu_canh: [{ tool: 'get_asset', filters: { id: 55 }, references: [{ kind: 'assets', ids: [55] }] }] } },
  ]).flat();
  const context = chatContext(rows); assert.equal(context.entries.length, 20);
  assert.equal(context.messages.length, 40); assert(context.messages[0].content.includes('FACT-0'));
  assert(context.messages.at(-2)!.content.includes('FACT-19')); assert(context.messages.at(-1)!.content.includes('Giữ thông tin'));
  assert(context.messages.at(-1)!.content.includes('55')); assert.equal(context.entries.at(-1)!.throughId, 40);
});

test('25 steps can persist more than six source traces; expanded input accepts ten attachments', () => {
  assert(ChatMetadataSchema.safeParse({ version: 1, ngu_canh: Array.from({length: 25}, () => ({ tool: 'lookup', filters: {}, references: [] })) }).success);
  const input = { requestId: '00000000-0000-4000-8000-000000000000', message: 'a'.repeat(8000), attachmentIds: Array.from({length: 10}, (_, i) => i + 1) };
  assert(AiChatSchema.safeParse(input).success);
  assert(!AiChatSchema.safeParse({...input, message: input.message + 'a'}).success);
  assert(!AiChatSchema.safeParse({...input, attachmentIds: [...input.attachmentIds, 11]}).success);
});
