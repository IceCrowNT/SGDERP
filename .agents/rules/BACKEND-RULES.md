# QUY TRÌNH & RÀNG BUỘC BACKEND (SERVER ACTIONS & RBAC SECURITY)

Tệp này quản lý cách thức xây dựng Logic Backend và Bảo mật Phân quyền cho Next.js Monolith trong dự án Sao Đỏ Group ERP.

---

## 1. Ranh giới Kiến trúc
- Sử dụng **Next.js Server Actions** (với chỉ thị `"use server"`) để xử lý toàn bộ các tác vụ Mutation (Tạo, Sửa, Xóa, Duyệt).
- Các API REST (`/api/`) chỉ dùng khi cần tích hợp với bên thứ ba (Webhooks, Mobile App). Các tương tác UI nội bộ phải đi qua Server Actions.

---

## 2. Ràng buộc Nghiệp vụ Cốt lõi
- **Không tin tưởng Client:**
  - Tuyệt đối KHÔNG LẤY `userId` hoặc `companyId` từ form payload của Client gửi lên để thực hiện tác vụ Create/Update.
  - LUÔN LẤY danh tính và quyền hạn người dùng thông qua Session ở Server.
- **Xác thực dữ liệu (Validation):**
  - Mọi payload từ Client phải được bọc trong một Schema của `zod`.
  - Phải xử lý `safeParse` để bắt lỗi Validation trước khi đi vào Logic lõi.
  - Trường bắt buộc theo nghiệp vụ phải được kiểm tra ở server kể cả UI đã có dấu `*`. Chuỗi bắt buộc không chấp nhận rỗng/toàn khoảng trắng; select không chấp nhận thiếu/null/ID không hợp lệ nếu không cho phép bỏ chọn. Giữ nguyên chính sách mật khẩu, không tự trim mật khẩu.
  - Schema tạo/sửa dùng thông báo tiếng Việt cho dữ liệu thiếu hoặc sai. Khi validation thất bại, trả `success: false`, `message` và `fieldErrors` theo tên field (từ `flatten().fieldErrors`) để UI đặt lỗi ngay dưới ô nhập; không ghi DB/audit thành công cho payload thiếu dữ liệu.
  - Dấu `*` biểu thị dữ liệu người dùng phải cung cấp/chọn, không biểu thị mọi cột NOT NULL: mã nhân sự tự sinh, công ty lấy từ session và ID hệ thống không bắt người dùng nhập. Trường mặc định bắt buộc (ví dụ tình trạng làm việc) vẫn cần giá trị hợp lệ; không biến trường tùy chọn thành bắt buộc ngoài yêu cầu nghiệp vụ.
- **Tính toàn vẹn (ACID Transactions):**
  - Khi một tác vụ yêu cầu Ghi (Create/Update/Delete) vào từ 2 bảng trở lên, **BẮT BUỘC** dùng `prisma.$transaction`. Nếu 1 bảng lỗi, toàn bộ phải rollback.

---

## 3. RÀNG BUỘC BẮT BUỘC VỀ PHÂN QUYỀN
1. **Quyền hiệu lực:** từ quan hệ `tai_khoan_vai_tro → vai_tro → vai_tro_quyen → quyen`, không có cột JSON permissions trên Role. `getSession()` kiểm tra DB mỗi lần: trạng thái tài khoản, phiên bản phiên và quyền hiện tại. Vai trò thuộc tài khoản; không cộng quyền từ các tài khoản khác cùng nhân sự.
2. **Kiểm tra Quyền ở đầu Server Action:**
   - Với thao tác Đọc dữ liệu nhạy cảm: Bắt buộc kiểm tra rõ `"VIEW"` hoặc `"MANAGE"`; thiếu quyền phải từ chối.
   - Với thao tác Ghi (Create/Update/Delete): Bắt buộc kiểm tra `session.permissions[MODULE] === "MANAGE"` (trừ phân hệ TASK cho phép nhân viên cập nhật trạng thái công việc được giao trực tiếp cho mình).
3. **Lọc Dữ liệu (Data Filtering):**
   - Luôn luôn có điều kiện `dinh_danh_cong_ty: session.companyId` trong mọi câu lệnh Prisma.

---

## 4. Tên dữ liệu trong Server Action — cập nhật 03/11/2026

- Model/field Prisma dùng chung tên tiếng Việt với PostgreSQL và Studio. Dùng trực tiếp `db.nhan_su`, `db.tai_khoan`, `db.phong_ban`; không tạo wrapper alias Employee/User/Department.
- Form, tham số hàm và JWT hiện có giữ hợp đồng ứng dụng riêng; chuyển tường minh sang trường DB tại action. Ví dụ `session.companyId` → `dinh_danh_cong_ty`, `values.fullName` → `ho_ten`. Không đổi cookie/JWT hoặc dữ liệu JSON lịch sử chỉ vì đổi tên model.
- Mẫu truy vấn đọc sau khi đã xác thực và kiểm tra quyền:

```typescript
const session = await getSession();
if (!session || !hasPermission(session, "HR")) {
  return { success: false, message: "Không có quyền xem nhân sự." };
}
const data = await db.nhan_su.findMany({
  where: { dinh_danh_cong_ty: session.companyId },
  select: { dinh_danh: true, ma_nhan_su: true, ho_ten: true },
});
return { success: true, data };
```

Mutation dùng Zod strict, kiểm tra MANAGE, xác minh liên kết cùng công ty và ghi audit cùng transaction. Mẫu thực thi đầy đủ tại `src/actions/employee.ts` và `src/actions/department.ts`; schema input tại `src/lib/validations/`. Không trả bản ghi tài khoản có mật khẩu băm ra client.

## 5. Ranh giới hồ sơ và truy cập

- HR MANAGE chỉ sửa hồ sơ, không quản lý mật khẩu/role. `/accounts` và actions tương ứng kiểm tra ADMIN/IT_ADMIN trong bản hiện tại; role management chi tiết theo kế hoạch riêng.
- Không trả password/hash/legacy profile trong payload action hoặc audit. Khi tạo/sửa tài khoản kiểm tra người và role cùng công ty; khóa tài khoản không cập nhật nhan_su.
- Đăng nhập username duy nhất, không đăng nhập mã nhân viên. Sửa tài khoản hoặc mật khẩu tăng phien_ban_dang_nhap (trường DB; JWT dùng sessionVersion) để thu hồi phiên cũ.
- Thay đổi dữ liệu và audit phải cùng transaction cho luồng nhân sự/tài khoản mới.

## 6. HR độc lập — 28/10/2026

- Mọi trường hồ sơ nghiệp vụ có thể sửa bởi HR MANAGE dù có nguồn HR/1Office; nguồn chỉ là lịch sử nhập.
- Schema input strict không nhận employeeCode, companyId, metadata nguồn hoặc role. Mã do DB cấp và không cập nhật; phòng ban bắt buộc cùng công ty. Ghi chú vận hành là notes, không sửa hrNotes gốc qua form.
- Không chạy lại importer snapshot lên hồ sơ vận hành. Seed phải idempotent và không tái sinh hồ sơ/tài khoản đã dọn.

## 7. Cơ cấu độc lập — 03/11/2026

- HR MANAGE được tạo, sửa tên/mã/mô tả/parent và xóa phòng ban rỗng. HR VIEW chỉ đọc. Không chặn theo externalSystem và không dựng DTO đối soát nguồn.
- Input strict; xác minh parent cùng công ty, không tự trỏ hoặc tạo chu trình; mutation và audit cùng transaction, khóa theo công ty khi sửa cây. Xóa còn kiểm tra con/nhân sự và khóa hàng phòng ban.
- Revalidate danh sách, danh bạ, tài khoản, 3D và tổng quan sau thay đổi. Không tự sửa vị trí 3D hoặc gán head/role từ tên/chức danh.
