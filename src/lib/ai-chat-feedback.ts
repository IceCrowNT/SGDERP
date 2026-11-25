import { AI_LIMITS } from "@/lib/ai-config";
/** User-facing recovery advice. Only classify known messages; never infer an old timeout from a generic connection error. */
export type AiChatFeedback = { reason: string; suggestion: string; canEdit: boolean };
export function aiChatFeedback(message: string, status?: string): AiChatFeedback {
  const match = (pattern: RegExp, reason: string, suggestion: string, canEdit = false): AiChatFeedback | undefined => pattern.test(message) ? { reason, suggestion, canEdit } : undefined;
  return match(/chưa trả lời xong trong thời gian chờ|Lượt xử lý đã quá lâu/i,
    "AI chưa hoàn tất trong thời gian chờ.", "Chia yêu cầu thành từng phần hoặc yêu cầu câu trả lời ngắn hơn, rồi gửi lại. Lượt bị ngắt có thể đã phát sinh phí.", true)
    ?? match(/lỗi kết nối|Kết nối AI bị gián đoạn/i,
      "Kết nối giữa hệ thống và dịch vụ AI bị gián đoạn; chưa xác định được nguyên nhân cụ thể.", "Chờ một lúc rồi thử lại. Nếu lỗi lặp lại, liên hệ quản trị viên kiểm tra kết nối dịch vụ. Lượt bị ngắt có thể đã phát sinh phí.", true)
    ?? match(/Mất kết nối\. Nội dung đã nhập/,
      "Trình duyệt chưa nhận được kết quả từ hệ thống.", "Giữ nguyên nội dung và bấm Gửi để kiểm tra yêu cầu cũ trước khi gọi AI. Chưa thể kết luận yêu cầu đã xử lý hay chưa.")
    ?? match(/giới hạn độ dài|quá dài để lưu/i,
      "Câu trả lời chưa hoàn tất trong giới hạn độ dài của một lượt.", "Yêu cầu AI viết từng phần, ví dụ: lập dàn ý trước, sau đó viết từng mục.", true)
    ?? match(/Chưa thu gọn được bối cảnh/i, message, "Thử gửi lại. Lịch sử gốc vẫn được giữ; có thể mở chat mới với yêu cầu đang làm nếu lỗi tiếp diễn.", true)
    ?? match(/Ngữ cảnh quá dài/i,
      "Lượng thông tin cần xử lý trong lượt này quá lớn.", "Chỉ rõ phần tài liệu hoặc dữ liệu cần xử lý. Có thể mở chat mới và cung cấp lại thông tin cần thiết.", true)
    ?? match(/đủ \d+ lượt/i, "Đây là thông báo giới hạn của phiên bản cũ.", "Giới hạn số lượt mỗi cuộc chat đã được bỏ. Gửi tiếp trong chat này; nếu còn lỗi, tải lại trang.")
    ?? match(/tối đa \d+ tệp/i, `Cuộc chat đã đạt giới hạn ${AI_LIMITS.files.perChat} tệp.`, "Mở Chat mới và đính kèm những tệp cần dùng.")
    ?? match(/giới hạn xử lý của lượt này|giới hạn tra cứu của lượt này/i,
      "Yêu cầu cần nhiều bước hơn giới hạn của một lượt.", "Kiểm tra các tệp hoặc bản nháp đã tạo, rồi yêu cầu tiếp tục một phần cụ thể.", true)
    ?? match(/\d+ yêu cầu trong [\d.]+ phút/i, `Bạn đã gửi đủ ${AI_LIMITS.request.shortWindowRequests} yêu cầu trong ${AI_LIMITS.request.shortWindowMs / 60000} phút gần nhất.`, `Chờ các lượt cũ ra khỏi khoảng ${AI_LIMITS.request.shortWindowMs / 60000} phút rồi gửi tiếp.`)
    ?? match(/\d+ yêu cầu trong [\d.]+ giờ/i, "Đây là thông báo giới hạn theo ngày của phiên bản cũ.", "Giới hạn theo ngày đã được bỏ. Bạn có thể gửi tiếp; nếu còn lỗi, tải lại trang.")
    ?? match(/giới hạn lượt thử AI/i, "Bạn đã đạt giới hạn số lượt gửi của hệ thống.", `Chờ rồi thử lại; giới hạn hiện tại là ${AI_LIMITS.request.shortWindowRequests} lượt trong ${AI_LIMITS.request.shortWindowMs / 60000} phút.`)
    ?? match(/Hạn mức AI tháng/i, "Hạn mức AI tháng của tài khoản không đủ cho lượt tiếp theo.", "Liên hệ quản trị viên để kiểm tra mức sử dụng và điều chỉnh hạn mức tài khoản.")
    ?? match(/Ngân sách tháng của kết nối/i, "Ngân sách tháng của kết nối AI không đủ.", "Liên hệ quản trị viên kiểm tra ngân sách kết nối trong Quản trị AI.")
    ?? match(/OpenAI báo hết hạn mức/i, "OpenAI báo kết nối đã hết hạn mức sử dụng.", "Nhờ quản trị viên kiểm tra Billing và giới hạn chi tiêu trên OpenAI. Gửi lại ngay chưa giải quyết được lỗi.")
    ?? match(/OpenAI đang giới hạn tốc độ/i, "OpenAI đang giới hạn tốc độ gửi yêu cầu.", "Chờ một lúc rồi thử lại. Nếu thường xuyên gặp lỗi, nhờ quản trị viên kiểm tra giới hạn tốc độ của kết nối.", true)
    ?? match(/giới hạn lượt gọi hoặc đã hết hạn mức/i, "OpenAI đang từ chối yêu cầu do giới hạn sử dụng; chưa xác định được loại giới hạn.", "Chờ rồi thử lại; nếu vẫn lỗi, nhờ quản trị viên kiểm tra cả giới hạn tốc độ và ngân sách OpenAI.")
    ?? match(/Khóa API hoặc quyền truy cập model|Khóa API không được OpenAI chấp nhận|OpenAI từ chối quyền truy cập|Model không khả dụng/i,
      message, "Nhờ quản trị viên kiểm tra khóa API, model và quyền truy cập của kết nối trong Quản trị AI.")
    ?? match(/OpenAI đang gặp sự cố/i, "Dịch vụ OpenAI đang gặp sự cố hoặc quá tải.", "Chờ một lúc rồi thử lại; nếu lỗi kéo dài, liên hệ quản trị viên.", true)
    ?? match(/bộ lọc nội dung/i, "Dịch vụ AI dừng phản hồi do bộ lọc nội dung.", "Nêu rõ mục đích hỗ trợ và chỉ cung cấp thông tin cần thiết. Nếu yêu cầu thông thường vẫn bị chặn, liên hệ quản trị viên.", true)
    ?? match(/chưa hoàn tất phản hồi|chưa hoàn tất câu trả lời trong giới hạn/i, "Dịch vụ AI chưa hoàn tất phản hồi; chưa xác định được nguyên nhân cụ thể.", "Thử lại sau; nếu lỗi lặp lại, liên hệ quản trị viên để kiểm tra lượt xử lý.", true)
    ?? match(/kho khóa AI/i, "Hệ thống chưa đọc được cấu hình bảo mật của kết nối AI.", "Liên hệ quản trị viên kiểm tra kho khóa trên máy chủ; không gửi API key trong chat.")
    ?? match(/Kết nối.*tạm dừng|Chưa cấu hình kết nối|Chưa chọn kết nối|Kết nối.*không còn khả dụng|Lưu kết nối từ máy chủ/i,
      message, "Nhờ quản trị viên kiểm tra kết nối đang sử dụng trong Cài đặt chung → Quản trị AI.")
    ?? match(/Cần cấu hình bảng giá đúng model để áp dụng hạn mức/i, "Lượt này từng bị chặn vì model chưa có đơn giá.", "Bạn có thể gửi lại yêu cầu ngay trong cuộc chat này. Đơn giá hiện là tùy chọn.", true)
    ?? match(/Cài đặt AI đã thay đổi/i, "Cấu hình AI đã thay đổi trong khi xử lý.", "Kiểm tra tệp hoặc bản nháp đã có trước khi gửi lại với cấu hình mới.", true)
    ?? match(/Phiên đăng nhập/i, "Phiên đăng nhập không còn hợp lệ.", "Sao chép nội dung đang soạn, đăng nhập lại rồi tiếp tục.")
    ?? match(/Nguồn dữ liệu trong chat không còn hợp lệ|Nguồn hội thoại không còn hợp lệ/i,
      "Không xác minh được quyền truy cập hoặc nguồn dữ liệu của hội thoại.", "Nhờ quản trị viên kiểm tra quyền và dữ liệu nguồn. Bạn có thể mở chat mới để trao đổi trong phạm vi quyền hiện tại.")
    ?? match(/chưa có quyền|Quyền.*đã thay đổi|Công cụ này không được phép/i,
      message, "Kiểm tra tác vụ đang chọn và quyền tài khoản; nhờ quản trị viên cấp quyền nghiệp vụ nếu cần.")
    ?? match(/đang xử lý|Yêu cầu đã được nhận|Yêu cầu này đã được nhận/i,
      "Hệ thống đã nhận yêu cầu và chưa xác nhận hoàn tất.", "Chờ và tải lại hội thoại để kiểm tra kết quả trước khi gửi yêu cầu khác.")
    ?? match(/Mã yêu cầu đã được dùng|Thao tác tạo tệp đã được dùng/i,
      "Yêu cầu gửi lại không khớp nội dung hoặc tệp của lần trước.", "Tải lại hội thoại để kiểm tra kết quả, sau đó soạn một yêu cầu mới nếu muốn đổi nội dung.")
    ?? match(/Tệp không tồn tại|Tệp nguồn không còn hợp lệ/i,
      "Không truy cập được tệp cần dùng trong lượt này.", "Kiểm tra tệp trong cuộc chat và đính kèm lại bản bạn có quyền sử dụng.", true)
    ?? match(/Không tìm thấy cuộc chat đang mở/i,
      "Cuộc chat không còn ở trạng thái có thể gửi tin nhắn.", "Mở lại từ lịch sử; nếu đã lưu trữ, chọn Khôi phục để chat tiếp.")
    ?? match(/không đọc được|Phản hồi AI không hợp lệ|AI trả nhiều công cụ|AI chưa trả được nội dung|OpenAI không chấp nhận yêu cầu/i,
      message, "Thử lại với một yêu cầu cụ thể hơn. Nếu vẫn lỗi, liên hệ quản trị viên kiểm tra cấu hình và khả năng hỗ trợ của model.", true)
    ?? (status === "GIAN_DOAN" || /hết thời gian xử lý|Lượt xử lý đã gián đoạn|Lượt xử lý đã hết hạn|Lượt chat chưa đầy đủ/i.test(message)
      ? { reason: "Lượt xử lý bị gián đoạn hoặc hết thời gian; chưa xác nhận được kết quả cuối cùng.", suggestion: "Tải lại hội thoại và kiểm tra tệp, bản nháp hoặc công việc đã có trước khi gửi tiếp. Gửi lại có thể phát sinh thêm phí.", canEdit: false }
      : { reason: /Chưa xử lý được yêu cầu AI|Lỗi xử lý nội bộ/i.test(message) ? "Hệ thống gặp lỗi xử lý và chưa xác định được nguyên nhân cụ thể." : message || "Chưa xác nhận được kết quả xử lý.", suggestion: "Tải lại hội thoại để kiểm tra kết quả. Nếu vẫn gặp lỗi, liên hệ quản trị viên và cung cấp thời điểm xảy ra lỗi.", canEdit: false });
}

/** Accept only documented categories; provider text is never displayed or logged. */
export function aiProviderError(status: number, body: unknown): string {
  const error = body && typeof body === "object" && "error" in body ? body.error : null;
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (status === 400 && code === "context_length_exceeded") return "Ngữ cảnh quá dài so với khả năng xử lý của model.";
  if (status === 429 && code === "insufficient_quota") return "OpenAI báo hết hạn mức sử dụng của kết nối.";
  if (status === 429 && code === "rate_limit_exceeded") return "OpenAI đang giới hạn tốc độ gửi yêu cầu.";
  if (status === 429) return "Dịch vụ AI đang giới hạn lượt gọi hoặc đã hết hạn mức.";
  if (status === 401) return "Khóa API không được OpenAI chấp nhận.";
  if (status === 403) return "OpenAI từ chối quyền truy cập của kết nối.";
  if (status === 404) return "Model không khả dụng hoặc kết nối chưa có quyền truy cập.";
  if (status >= 500) return "OpenAI đang gặp sự cố hoặc quá tải.";
  return "OpenAI không chấp nhận yêu cầu; chưa xác định được nguyên nhân cụ thể.";
}
