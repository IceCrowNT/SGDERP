import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiChatFeedback, aiProviderError } from '../../src/lib/ai-chat-feedback';

test('legacy connection errors do not invent timeout, depleted credit, or saved results', () => {
  const feedback = aiChatFeedback('Kết nối AI bị gián đoạn; lượt này có thể đã phát sinh phí. Chưa có hồ sơ nào được lưu. Bạn có thể gửi lại yêu cầu.', 'LOI');
  assert.match(feedback.reason, /chưa xác định/);
  assert(!/thời gian chờ|hết hạn mức|Chưa có hồ sơ/.test(feedback.reason));
  assert.match(feedback.suggestion, /có thể đã phát sinh phí/);
});
test('recovery guidance distinguishes actionable failures without guessing internal errors', () => {
  for (const [message, suggestion, editable] of [
    ['AI chưa trả lời xong trong thời gian chờ.', /Chia yêu cầu/, true],
    ['Câu trả lời vượt giới hạn độ dài', /viết từng phần/, true],
    ['Ngữ cảnh quá dài', /Chỉ rõ phần/, true],
    ['Hạn mức AI tháng này không đủ', /quản trị viên/, false],
    ['Ngân sách tháng của kết nối AI không đủ', /ngân sách kết nối/, false],
    ['Phiên đăng nhập không còn hợp lệ', /đăng nhập lại/, false],
    ['Cần cấu hình bảng giá đúng model để áp dụng hạn mức. Để trống hạn mức nếu chưa muốn giới hạn.', /gửi lại yêu cầu/, true],
    ['Cuộc chat đã đủ 200 lượt', /đã được bỏ/, false],
    ['Mỗi cuộc chat tối đa 20 tệp', /Chat mới/, false],
    ['Bạn đã gửi đủ 10 yêu cầu trong 5 phút', /khoảng 5 phút/, false],
    ['Bạn đã gửi đủ 100 yêu cầu trong 24 giờ', /đã được bỏ/, false],
    ['Nguồn dữ liệu trong chat không còn hợp lệ', /quyền và dữ liệu/, false],
    ['Một yêu cầu AI đang xử lý', /Chờ và tải lại/, false],
    ['Kết nối AI đang tạm dừng', /quản trị viên/, false],
    ['Lượt xử lý đã gián đoạn', /kiểm tra tệp/, false],
    ['Chưa xử lý được yêu cầu AI. Kiểm tra quyền hoặc thử lại sau.', /quản trị viên/, false],
  ] as const) {
    const feedback = aiChatFeedback(message, 'LOI');
    assert.match(feedback.suggestion, suggestion, message); assert.equal(feedback.canEdit, editable, message);
  }
  assert.match(aiChatFeedback('Chưa xử lý được yêu cầu AI. Kiểm tra quyền hoặc thử lại sau.').reason, /chưa xác định/);
});
test('provider categories use status and allowlisted code, never raw provider content', () => {
  for (const [status, code, pattern] of [[429,'insufficient_quota',/hết hạn mức/],[429,'rate_limit_exceeded',/giới hạn tốc độ/],[429,null,/hoặc/],[401,null,/Khóa API/],[403,null,/quyền truy cập/],[404,null,/Model/],[503,null,/sự cố/],[400,null,/chưa xác định/]] as const) {
    const message = aiProviderError(status, {error:{code,message:'SECRET-RAW-PROVIDER-DETAIL'}});
    assert.match(message, pattern); assert(!message.includes('SECRET')); assert(aiChatFeedback(message).suggestion);
  }
  assert.match(aiProviderError(429, '<html>gateway</html>'), /hoặc/);
  assert.match(aiProviderError(429, {error:{code:'invented'}}), /hoặc/);
});

test('incomplete unknown and filtered replies are not mislabeled as output limits', () => {
  assert(!aiChatFeedback('AI chưa hoàn tất câu trả lời trong giới hạn lượt thử.').reason.includes('độ dài'));
  assert.match(aiChatFeedback('Dịch vụ AI dừng phản hồi do bộ lọc nội dung.').reason, /bộ lọc nội dung/);
  assert.match(aiProviderError(400, {error:{code:'context_length_exceeded'}}), /Ngữ cảnh quá dài/);
});
