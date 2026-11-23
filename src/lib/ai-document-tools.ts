import { z } from "zod";
const text = z.string().max(10000), cell = z.union([text, z.number().finite(), z.boolean(), z.null()]);
const filename = z.string().trim().min(1).max(160);
const id = z.number().int().positive();
const wordTable = z.object({ headers: z.array(text).min(1).max(12), rows: z.array(z.array(text).max(12)).max(200) }).strict();
export const DocumentSchemas = {
  convert_pdf_to_word: z.object({ filename, fileId: id, pages: z.array(z.object({ page: z.number().int().min(1).max(20), paragraphs: z.array(text).max(200), tables: z.array(wordTable).max(5) }).strict()).min(1).max(20).nullable() }).strict(),
  update_word_text: z.object({ filename, fileId: id, changes: z.array(z.object({ expected: z.string().min(1).max(10000), replacement: text, occurrences: z.number().int().min(1).max(100) }).strict()).min(1).max(100) }).strict(),
  create_word_file: z.object({ filename, title: text, paragraphs: z.array(text).max(200), tables: z.array(z.object({ headers: z.array(text).min(1).max(12), rows: z.array(z.array(text).max(12)).max(200) }).strict()).max(5) }).strict(),
  fill_word_template: z.object({ filename, fileId: id, replacements: z.array(z.object({ placeholder: z.string().min(1).max(100), value: text }).strict()).min(1).max(100) }).strict(),
  create_excel_file: z.object({ filename, sheets: z.array(z.object({ name: z.string().min(1).max(31), rows: z.array(z.array(cell).max(50)).min(1).max(1000) }).strict()).min(1).max(10) }).strict(),
  update_excel_cells: z.object({ filename, fileId: id, sheet: z.string().min(1).max(31), changes: z.array(z.object({ cell: z.string().regex(/^[A-Z]{1,3}[1-9][0-9]{0,5}$/), expected: cell, value: cell, formula: z.string().max(500).nullable() }).strict()).min(1).max(200) }).strict(),
  fill_pdf_form: z.object({ filename, fileId: id, fields: z.array(z.object({ name: z.string().min(1).max(200), value: z.union([text, z.boolean()]) }).strict()).min(1).max(100), flatten: z.boolean() }).strict(),
  assemble_pdf: z.object({ filename, sources: z.array(z.object({ fileId: id, pages: z.array(z.number().int().min(1).max(200)).min(1).max(200) }).strict()).min(1).max(10) }).strict(),
  convert_file_to_pdf: z.object({ filename, fileId: id }).strict(),
};
export type DocumentToolName = keyof typeof DocumentSchemas;
const str = { type: "string" }, num = { type: "integer" }, scalar = { type: ["string", "number", "boolean", "null"] };
const array = (items: object) => ({ type: "array", items });
const object = (properties: Record<string, object>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const schemas = {
  convert_pdf_to_word: object({ filename: str, fileId: num, pages: { anyOf: [array(object({ page: num, paragraphs: array(str), tables: array(object({ headers: array(str), rows: array(array(str)) })) })), { type: "null" }] } }),
  update_word_text: object({ filename: str, fileId: num, changes: array(object({ expected: str, replacement: str, occurrences: num })) }),
  create_word_file: object({ filename: str, title: str, paragraphs: array(str), tables: array(object({ headers: array(str), rows: array(array(str)) })) }),
  fill_word_template: object({ filename: str, fileId: num, replacements: array(object({ placeholder: str, value: str })) }),
  create_excel_file: object({ filename: str, sheets: array(object({ name: str, rows: array(array(scalar)) })) }),
  update_excel_cells: object({ filename: str, fileId: num, sheet: str, changes: array(object({ cell: str, expected: scalar, value: scalar, formula: { type: ["string", "null"] } })) }),
  fill_pdf_form: object({ filename: str, fileId: num, fields: array(object({ name: str, value: { type: ["string", "boolean"] } })), flatten: { type: "boolean" } }),
  assemble_pdf: object({ filename: str, sources: array(object({ fileId: num, pages: array(num) })) }),
  convert_file_to_pdf: object({ filename: str, fileId: num }),
};
const descriptions: Record<DocumentToolName, string> = {
  convert_pdf_to_word: "Dựng Word mới từ PDF nguồn trong chat, tối đa 20 trang, giữ nguồn. pages=null trích lớp chữ thành đoạn; không giữ bố cục/bảng và từ chối trang thiếu chữ. Với scan/bảng/bố cục cần dựng lại: đọc từng trang bằng read_pdf_page rồi truyền pages gồm TẤT CẢ trang theo thứ tự 1..N, paragraphs và tables (đoạn trước bảng mỗi trang). Không bịa chữ/số mờ hoặc bỏ trang. Đây là bản dựng lại, không bảo đảm số trang/bố cục giống nguồn. Muốn sửa nội dung sau chuyển dùng update_word_text; xuất bằng convert_file_to_pdf.",
  update_word_text: "Thay chữ trong thân Word (kể cả ô bảng) thành bản mới. Đọc trước; expected là chuỗi chính xác trong một đoạn, occurrences là tổng số lần xuất hiện mong đợi trong thân tài liệu. Sai số lần khớp thì không sửa. Dùng đoạn/ô đủ rõ, không thay mọi số giống nhau khi chỉ muốn sửa một mục. Giữ cấu trúc bảng, chữ thay lấy định dạng run đầu; chưa sửa header/footer, textbox, tracked changes hoặc bố cục. Không tự tính số tiền; phải tính/kiểm tra các khoản liên quan rồi sửa rõ từng mục.",
  create_word_file: "Tạo Word mới (.docx) với tiêu đề, đoạn văn và bảng. Nội dung văn bản thuần, không HTML/Markdown. Tối đa 200 đoạn, 5 bảng/200 dòng/12 cột. Trả tệp tải xuống, không ghi hồ sơ ERP.",
  fill_word_template: "Điền mẫu Word có {{placeholder}} từ tệp của chat; đọc mẫu trước để xác định tên. Tạo bản mới, giữ bản gốc. Không dùng để thay đoạn tùy ý hoặc sửa toàn bộ bố cục.",
  create_excel_file: "Tạo XLSX mới từ dữ liệu theo sheet/dòng/ô; số giữ kiểu số. Tối đa 10 sheet, 1000 dòng/sheet, 50 cột, tổng 20000 ô. Chuỗi bắt đầu = vẫn là văn bản, không tự chạy công thức.",
  update_excel_cells: "Sửa tối đa 200 ô XLSX thành bản mới. Phải đọc tệp trước; expected là giá trị hiện tại (null nếu trống). formula=null để ghi value; công thức chỉ hỗ trợ SUM/AVERAGE/MIN/MAX/COUNT và phép toán trong cùng sheet. Kết quả công thức chưa tính lại. Không sửa macro/chart/pivot hoặc cấu trúc phức tạp.",
  fill_pdf_form: "Điền PDF có trường form; đọc_ai_attachment (read_ai_attachment) trước để lấy đúng tên/loại trường. Hỗ trợ text/check/dropdown/radio; không thay văn bản thường trên trang. flatten=true để chốt trường thành nội dung PDF.",
  assemble_pdf: "Ghép hoặc trích/sắp xếp trang PDF từ các tệp của chat, số trang bắt đầu 1. Tối đa 200 trang đầu ra. Không sửa chữ trên trang, không giữ trường form tương tác.",
  convert_file_to_pdf: "Xuất tệp DOCX hoặc XLSX trong chat thành PDF bằng LibreOffice chạy nền, giữ bản gốc. Tối đa 45 giây. Không nhận đường dẫn, URL hoặc lệnh hệ điều hành.",
};
export const AI_DOCUMENT_TOOLS = (Object.keys(schemas) as DocumentToolName[]).map(name => ({ type: "function" as const, name, description: descriptions[name], strict: true, parameters: schemas[name] }));
