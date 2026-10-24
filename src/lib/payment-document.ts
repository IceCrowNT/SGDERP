import { AlignmentType, Document, Footer, Packer, PageNumber, Paragraph, TextRun } from "docx";

export interface PaymentDocumentData {
  requester: string;
  department: string;
  supplier: string;
  invoice: string;
  amount: string;
  purpose: string;
  recipient?: string;
  documentDate?: string;
}

/** Local template rendering only; never claims AI generation or approval. */
export async function createPaymentDocument(data: PaymentDocumentData): Promise<Blob> {
  const money = `${Number(data.amount).toLocaleString("vi-VN")} đồng`;
  const blank = "........................................................";
  const date = data.documentDate
    ? `Ngày ${data.documentDate.slice(8, 10)} tháng ${data.documentDate.slice(5, 7)} năm ${data.documentDate.slice(0, 4)}`
    : "Ngày ..... tháng ..... năm ..........";
  const p = (text: string, bold = false) => new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [new TextRun({ text, bold })],
  });
  const paragraphs = (text: string) => text.split(/\r?\n/).map(line => p(line));
  const heading = (title: string, newPage = false) => [
    new Paragraph({ pageBreakBefore: newPage, alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "SAO ĐỎ GROUP", bold: true, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 240 }, children: [new TextRun({ text: date, italics: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 280 }, children: [new TextRun({ text: title, bold: true, size: 30 })] }),
    p(`Kính gửi: ${data.recipient?.trim() || blank}`),
  ];
  const sign = () => [
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 100 }, children: [new TextRun({ text: "NGƯỜI ĐỀ NGHỊ", bold: true })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 900 }, children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(data.requester)] }),
  ];
  const doc = new Document({
    creator: "SDG ERP",
    title: "Đề nghị thanh toán và tờ trình",
    styles: { default: { document: { run: { font: "Times New Roman", size: 26 }, paragraph: { spacing: { after: 120, line: 276 } } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134, header: 567, footer: 567 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Khung thử nghiệm — cần rà soát trước khi sử dụng  |  Trang ", size: 18, color: "666666" }), new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
      children: [
        ...heading("GIẤY ĐỀ NGHỊ THANH TOÁN"),
        p(`Người đề nghị: ${data.requester}`), p(`Phòng ban: ${data.department}`),
        p("Đề nghị xem xét thanh toán với các thông tin sau:"),
        p(`Đơn vị bán hàng: ${data.supplier}`), p(`Số hóa đơn tham chiếu: ${data.invoice}`),
        p(`Số tiền đề nghị thanh toán: ${money}`, true),
        p("Nội dung / lý do thanh toán:", true), ...paragraphs(data.purpose),
        p(`Hình thức thanh toán: ${blank}`), p(`Thông tin người thụ hưởng / tài khoản: ${blank}`),
        p(`Chứng từ thực tế kèm theo: ${blank}`),
        ...sign(),
        ...heading("TỜ TRÌNH", true),
        p(`Người trình: ${data.requester}`), p(`Phòng ban: ${data.department}`),
        p("Về việc: Đề nghị xem xét thanh toán", true),
        p("1. Nội dung và lý do đề xuất", true), ...paragraphs(data.purpose),
        p("2. Thông tin và kinh phí đề nghị", true),
        p(`Đơn vị bán hàng: ${data.supplier}. Số hóa đơn tham chiếu: ${data.invoice}.`),
        p(`Kinh phí đề nghị xem xét: ${money}.`),
        p("3. Kiến nghị", true),
        p(`Kính đề nghị xem xét nội dung nêu trên và cho ý kiến về việc thanh toán số tiền ${money}.`),
        p(`Ý kiến của người có thẩm quyền: ${blank}`), ...sign(),
      ],
    }],
  });
  return Packer.toBlob(doc);
}
