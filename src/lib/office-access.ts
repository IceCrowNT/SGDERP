import type { Prisma } from '@prisma/client';
import { readAccountSession } from './account-session';
import { currentAccountActor } from './rbac-server';
import { assertChatSources } from './ai-chat-server';
import { canUseAiChat } from './ai-pilot';
import { OfficeError, type OfficeSessionData } from './office-editor';
export async function officeActor(data: OfficeSessionData) {
  const actor = await readAccountSession(data.userId);
  if (!actor || actor.companyId !== data.companyId || actor.sessionVersion !== data.version || !canUseAiChat(actor)) throw new OfficeError('Phiên chỉnh sửa đã hết hiệu lực. Hãy đăng nhập và mở lại tài liệu.');
  return actor;
}
export async function officeSource(tx: Prisma.TransactionClient, data: OfficeSessionData, actor: NonNullable<Awaited<ReturnType<typeof readAccountSession>>>, write = false) {
  const current = await currentAccountActor(tx, actor);
  const owner = { company_id: data.companyId, account_id: data.userId };
  const chat = await tx.hoi_thoai_ai.findFirst({ where: { id: data.chatId, ...owner } });
  const file = await tx.tep_dinh_kem_ai.findFirst({ where: { id: data.fileId, hoi_thoai_id: data.chatId, ...owner } });
  if (!chat || !file || (write && (!data.editable || chat.trang_thai !== 'DANG_MO'))) throw new OfficeError('Tệp không khả dụng hoặc cuộc chat đã lưu trữ.');
  const sources = await tx.tin_nhan_ai.findMany({ where: { hoi_thoai_id: chat.id }, select: { vai_tro: true, trang_thai: true, du_lieu_kem_theo: true } });
  await assertChatSources(tx, { ...actor, permissions: current.permissions }, sources);
  return file;
}
