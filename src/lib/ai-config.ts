/**
 * CẤU HÌNH GIỚI HẠN AI — sửa các mức vận hành tại duy nhất file này.
 * Dùng chung cho backend, giao diện và worker tài liệu (truyền qua workerData).
 * Không chứa bí mật. API key/model/ngân sách từng user vẫn do cấu hình trong DB quản lý.
 * Đây là giới hạn ERP tự đặt, không thay đổi quota/context window của OpenAI.
 * Thay đổi cần build/khởi động lại ứng dụng và kiểm tra tải thực tế.
 * Ký tự ở JS được đếm bằng string.length; byte UTF-8 và token là đơn vị khác.
 */
export const AI_LIMITS = {
  request: {
    // Thời gian một lần gọi OpenAI (ms); mỗi lượt có thể gọi nhiều lần.
    responseTimeoutMs: 180_000,
    // Ngân sách thời gian cho vòng xử lý; không khởi chạy API mới khi hết (ms).
    turnTimeoutMs: 600_000,
    // Khóa lượt đang xử lý (ms), phải dài hơn turnTimeoutMs; chặn kết quả đến muộn.
    leaseMs: 660_000,
    // Token đầu ra mỗi lần gọi; dùng cả khi đặt trước chi phí.
    maxOutputTokens: 12_000,
    // Tối đa số lần gọi model cho một yêu cầu, gồm cả lần trả lời cuối.
    // Dùng chung cho mọi tác vụ; hoàn tất sớm thì dừng, không chạy đủ số lần.
    // Bao gồm lần tóm tắt bối cảnh; vẫn chịu giới hạn thời gian/ngữ cảnh/ngân sách.
    maxSteps: 25,
    // Byte UTF-8 của ngữ cảnh; không cộng chuỗi base64 ảnh vào phép kiểm tra này.
    contextBytes: 256_000,
    // Ký tự JSON tham số một tool call.
    toolArgumentsChars: 24_000,
    // Cửa sổ trượt theo tài khoản, không đặt lại vào đầu ngày.
    // Khóa đồng thời kiểm tra riêng, không phụ thuộc cửa sổ chống gửi dồn.
    shortWindowMs: 5 * 60_000,
    shortWindowRequests: 10,
  },
  chat: {
    // Ký tự tối đa câu hỏi mới; cùng mức ở form/server và CHECK tin_nhan_ai_user_check.
    messageChars: 8000,
    // Hợp đồng schema tin nhắn cũ, không phải số ký tự câu hỏi mới.
    legacyMessageChars: 8000,
    // CÓ RÀNG BUỘC DB: tăng mức này phải thêm migration CHECK tin_nhan_ai mới.
    // Không sửa migration đã áp dụng. DB vẫn giữ mức 8000 cho vai trò người dùng.
    answerChars: 32_000,
  },
  history: {
    // Ngưỡng thu gọn theo byte UTF-8, KHÔNG giả định byte là token của model.
    // Không xóa lịch sử; tóm tắt phần cũ, giữ các lượt gần đây và công cụ tra lại.
    compactAtBytes: 96_000,
    recentTurns: 6,
    recentBytes: 32_000,
    summaryChars: 12_000,
    summaryBytes: 24_000,
    summaryOutputTokens: 6000,
    chunkBytes: 64_000,
    // Thu gọn transcript công cụ trước khi chạm trần context của ERP.
    toolCompactAtBytes: 192_000,
    // Công cụ tìm lại lịch sử phân trang, chỉ trong cuộc chat đang mở.
    searchRows: 6,
    searchChars: 12_000,
  },
  files: {
    // Dung lượng tệp đầu vào/đầu ra (byte); 1 MiB = 1024 * 1024 byte.
    maxBytes: 10 * 1024 * 1024,
    // Số tệp đính kèm một tin nhắn và một cuộc chat.
    perMessage: 10,
    perChat: 20,
    // Tệp tải lên nhưng chưa gửi và tổng kho tệp mỗi tài khoản/công ty.
    maxPending: 20,
    storageBytes: 200 * 1024 * 1024,
    // Bảo vệ giải nén DOCX/XLSX: số mục ZIP và tổng byte sau giải nén.
    zipEntries: 2000,
    zipExpandedBytes: 30 * 1024 * 1024,
    // Ảnh: pixel đầu vào, cạnh preview (px), chất lượng JPEG (1–100).
    imagePixels: 25_000_000,
    previewSide: 2048,
    jpegQuality: 88,
    // Đọc Word: ký tự toàn tệp và từng đoạn.
    wordChars: 300_000,
    paragraphChars: 15_000,
    // Đọc theo lô: chỉ số bắt đầu, số dòng/đoạn và ký tự JSON trả về.
    readStart: 300_000,
    readRows: 50,
    readChars: 16_000,
    // Tổng hợp bảng tính: dòng tiêu đề, số bộ lọc và số nhóm kết quả.
    headerRow: 100,
    filters: 3,
    groups: 100,
  },
  sheets: {
    // Giới hạn đầu vào: số sheet, tổng dòng, tổng ô, cột mỗi sheet.
    maxSheets: 20,
    maxRows: 100_000,
    maxCells: 200_000,
    maxColumns: 256,
    // Ký tự mỗi ô và ký tự JSON sau trích xuất.
    cellChars: 10_000,
    extractedChars: 5_000_000,
  },
  pdf: {
    // Số trang đọc/ghép PDF và số trang dựng lại thành Word.
    maxPages: 200,
    wordPages: 20,
    // Ký tự mỗi trang và tổng lớp chữ khi dựng Word.
    pageChars: 30_000,
    // Ký tự JSON của dữ liệu biểu mẫu khi kiểm tra PDF.
    formChars: 50_000,
    wordChars: 100_000,
    // Dưới số ký tự này cần đọc ảnh trang để nhận diện nội dung.
    visionThresholdChars: 20,
    // Ảnh nhúng tối đa (pixel), ảnh render tối đa (byte), hệ số phóng tối đa.
    imagePixels: 16_000_000,
    renderBytes: 8 * 1024 * 1024,
    renderScale: 2,
  },
  documents: {
    // Ký tự JSON toàn bộ yêu cầu tạo/sửa tài liệu và một nội dung văn bản.
    inputChars: 100_000,
    textChars: 10_000,
    // Giới hạn tài liệu Word tạo mới (hoặc mỗi trang Word dựng từ PDF).
    paragraphs: 200,
    tables: 5,
    tableRows: 200,
    tableColumns: 12,
    // Số thay đổi/placeholder Word; số lần khớp một chuỗi cần thay.
    wordChanges: 100,
    wordOccurrences: 100,
    // Excel tạo mới: số sheet, dòng/sheet, cột/sheet và tổng ô.
    sheets: 10,
    rows: 1000,
    columns: 50,
    cells: 20_000,
    // Excel sửa: số ô và ký tự công thức; PDF: số trường form/số tệp ghép.
    cellChanges: 200,
    formulaChars: 500,
    pdfFields: 100,
    pdfSources: 10,
  },
  workers: {
    // Bộ nhớ V8 (MiB), không phải giới hạn tổng RSS của cả tiến trình.
    sheetMemoryMb: 128,
    documentMemoryMb: 256,
    // Thời gian worker đọc bảng tính / đọc ghi tài liệu / LibreOffice (ms).
    sheetTimeoutMs: 15_000,
    documentTimeoutMs: 30_000,
    officeTimeoutMs: 45_000,
    // Dung lượng stdout/stderr tối đa của LibreOffice (byte).
    officeBufferBytes: 32_768,
  },
};
