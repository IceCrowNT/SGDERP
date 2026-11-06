# QUY TRÌNH & RÀNG BUỘC BACKEND (SERVER ACTIONS & RBAC SECURITY)

## Không gian cá nhân và tài khoản mặc định — 05/11/2026

- Dashboard/profile là quyền nền của tài khoản hợp lệ, không cần HR hoặc tên role đặc biệt. Action lấy người từ phiên, chỉ cho sửa liên hệ/ảnh; không nhận ID nhân sự từ client, không trả ghi chú HR hoặc metadata nhập liệu.
- DEFAULT không có quyền nghiệp vụ; không sửa/xóa hoặc gán grant vào nhóm này. Tạo tài khoản không chọn role dùng DEFAULT; tự sinh tên theo tên + chữ đầu họ/đệm, chuẩn hóa tiếng Việt. Profile, role và tài khoản khóa hàng công ty trước advisory phân quyền để tránh đảo thứ tự với HR/workflow. Tất cả luồng tạo tài khoản khóa advisory `(260127, 0)` sau khóa phân quyền công ty; unique username toàn hệ thống là ràng buộc cuối.
- `createAccount` là lựa chọn cấp tài khoản khi tạo/sửa hồ sơ; nếu cấp cần HR MANAGE và ACCOUNTS MANAGE. Username/mật khẩu có thể tự sinh, role không bắt nhập. Thay quy tắc cũ bắt đủ ba trường bên dưới; lưu người/tài khoản/role/audit nguyên tử.
- Tài khoản mới/reset mật khẩu đặt `bat_buoc_doi_mat_khau=true`. `getSession()` mặc định không cho vào nghiệp vụ khi cờ còn bật; chỉ profile/đổi mật khẩu/logout và layout dùng `allowPasswordChange`. Actor trong transaction cũng chặn cờ; không chỉ dựa vào middleware/JWT.
- Đổi mật khẩu kiểm tra mật khẩu hiện tại, tăng phiên bản, tắt cờ đổi lần đầu, cấp cookie mới cho phiên hiện tại; các phiên cũ hết hiệu lực, tài khoản khác của cùng người giữ nguyên. Mật khẩu tạm chỉ trả một lần cho người cấp, không lưu log/audit hoặc localStorage.
- Avatar upload qua Server Action, sharp kiểm tra và chuẩn hóa JPEG/PNG/WebP sang WebP (2 MB, 16 triệu pixel tối đa), lưu ngoài public/Git. Ngoại lệ GET `/media/avatar/[file]` chỉ phục vụ ảnh: phiên hợp lệ + chủ ảnh hoặc HR VIEW cùng công ty; không cache công khai. Mọi mutation vẫn là Server Action.
- Quyền workflow được cấu hình và gán tập trung tại `/roles` bởi ROLES MANAGE. Trang workflow chỉ đọc quyền đã cấp; không có action tự cấp quyền hoặc bước xác nhận kích hoạt cho người sử dụng. Giữ kiểm tra/audit cùng transaction khi sửa phân quyền.

## Workflow thử nghiệm — 05/11/2026

- Ngoại lệ quy tắc MANAGE chung: `WORKFLOW` kiểm tra hành động VIEW/CREATE/APPROVE/EXECUTE/MANAGE qua `workflowActions` và `canWorkflow`. MANAGE gồm VIEW toàn công ty, không gồm gửi/duyệt/thực hiện. Các thao tác còn lại cần VIEW và đúng quyền hành động trên **cùng tài khoản**.
- Đọc lọc công ty + người gửi/người được giao ở bảng bước (kể cả bước đã xử lý); chỉ MANAGE được đọc toàn công ty. Không suy quyền từ mã role/chức vụ/head. Người không gắn hồ sơ nhân sự chỉ có thể cấu hình/điều phối khi được cấp MANAGE.
- Ghi qua `src/actions/workflow.ts`: khóa công ty → advisory `(260126, companyId)` → hàng hồ sơ; đọc lại trạng thái tài khoản/nhân sự/quyền trong transaction. State, assignment, history cùng commit; không gọi dịch vụ ngoài.
- CREATE/APPROVE/EXECUTE yêu cầu nhân sự ACTIVE; APPROVAL không tự duyệt theo ID nhân sự, kể cả nhiều tài khoản. Chuyển giao/hủy/từ chối có lý do. Chỉ phân công khi một tài khoản đang mở của người đó có đủ VIEW + hành động, không cộng quyền các tài khoản.
- Bước head lấy phòng người gửi chốt lúc gửi, phân giải người khi kích hoạt; bước đang giao giữ nguyên. Không có người đủ điều kiện thì chặn gửi hoặc BLOCKED; điều phối chuyển giao, không bỏ qua bước. UI kiểm tra lại điều kiện của người đang giao để báo vướng, chưa cần job nền.
- Không có action xóa mẫu đã phát hành/hồ sơ/lịch sử. Mẫu cũ bất biến; lập lại hồ sơ bị từ chối tạo nháp mới liên kết cũ. Danh sách bản đầu giới hạn 200 bản ghi gần nhất và ghi rõ trên UI.

## Quyền DB — 04/11/2026 (hiện hành)

- Mã role/chức danh/head không cấp quyền. `permissionLevels` chỉ hợp nhất VIEW/MANAGE có `pham_vi=ALL`; không nâng scoped grant thành toàn công ty. Danh mục UI nằm tại `role-catalog.ts`.
- ACCOUNTS MANAGE quản lý tài khoản, ROLES MANAGE quản trị ma trận và mọi quyền công ty, AUDIT VIEW xem nhật ký trong tenant. Người chỉ quản lý tài khoản không được sửa tài khoản/gán role có quyền vượt quyền mình; kiểm tra cả quyền cũ và mới để chặn đặt lại mật khẩu quản trị.
- Mutation phân quyền/tài khoản/HR khóa advisory `(260126, companyId)`, đọc lại quyền actor/trạng thái/phiên trong transaction. Giữ thứ tự khóa công ty → advisory nếu dùng cả hai. Action role và gán role dùng version từ `updated_at` chống ghi đè; audit và thay đổi cùng transaction.
- Luôn giữ một tài khoản sử dụng được có cả ACCOUNTS MANAGE và ROLES MANAGE, kể cả hai quyền đến từ role khác nhau. Kiểm tra này thay cho tìm mã ADMIN; nghỉ việc vẫn giữ kiểm tra bàn giao quản trị.
- Sửa role chỉ thay các quyền trong catalog hiện hành; giữ nguyên grant ngoài ma trận. Không xóa role hệ thống/đang dùng. Mã role không đổi. Revalidate layout để menu phản ánh quyền mới; server không dựa vào menu.
- JWT không dùng secret dự phòng; yêu cầu SESSION_SECRET cấu hình đủ 32 ký tự. Seed không được ghi đè/phục hồi quyền đã chỉnh trong ERP.


## Nhân sự, tài khoản tùy chọn và nghỉ việc — 04/11/2026

- Action lưu nhân sự nhận `createAccount` và các trường nâng cao `accountUsername/accountPassword/accountRoleIds`; quy tắc tự cấp hiện hành ở mục 05/11 phía trên. Bỏ lựa chọn và để trống phần nâng cao thì chỉ tạo hồ sơ.
- Lưu hồ sơ, tạo tài khoản, gán role, khóa tài khoản khi nghỉ và nhật ký trong cùng transaction. HR MANAGE được ghi nhận nghỉ việc và tự khóa các tài khoản liên kết theo chính sách đã duyệt, nhưng không được tự mở tài khoản hoặc gán role.
- Thứ tự khóa: hàng `cong_ty` trước (đồng bộ với sửa cơ cấu), rồi advisory lock `(260126, companyId)` dùng chung với action tài khoản. Kiểm tra trạng thái nhân sự trong khóa trước khi mở/tạo tài khoản, tránh race với nghỉ việc. Không khóa quản trị cuối cùng còn sử dụng được; báo cần bàn giao quyền, rollback toàn bộ.
- Session chặn tài khoản đóng hoặc nhân sự LEFT. Nghỉ việc thu hồi các phiên; ACTIVE/UNKNOWN trở lại không tự mở tài khoản. Tài khoản hệ thống không gắn người vẫn kiểm tra trạng thái tài khoản riêng.
- Head phòng: xác minh cùng công ty; chỉ gán mới người ACTIVE. Giữ head cũ không ACTIVE khi sửa thông tin khác, hiển thị cần bàn giao; chọn head không cấp role và không suy quyền từ chức danh.


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
   - Luôn luôn có điều kiện `company_id: session.companyId` trong mọi câu lệnh Prisma.

---

## 4. Tên dữ liệu trong Server Action — cập nhật 03/11/2026

- Model/field Prisma dùng chung tên tiếng Việt với PostgreSQL và Studio. Dùng trực tiếp `db.nhan_su`, `db.tai_khoan`, `db.phong_ban`; không tạo wrapper alias Employee/User/Department.
- Form, tham số hàm và JWT hiện có giữ hợp đồng ứng dụng riêng; chuyển tường minh sang trường DB tại action. Ví dụ `session.companyId` → `company_id`, `values.fullName` → `ho_ten`. Không đổi cookie/JWT hoặc dữ liệu JSON lịch sử chỉ vì đổi tên model.
- Mẫu truy vấn đọc sau khi đã xác thực và kiểm tra quyền:

```typescript
const session = await getSession();
if (!session || !hasPermission(session, "HR")) {
  return { success: false, message: "Không có quyền xem nhân sự." };
}
const data = await db.nhan_su.findMany({
  where: { company_id: session.companyId },
  select: { id: true, ma_nhan_su: true, ho_ten: true },
});
return { success: true, data };
```

Mutation dùng Zod strict, kiểm tra MANAGE, xác minh liên kết cùng công ty và ghi audit cùng transaction. Mẫu thực thi đầy đủ tại `src/actions/employee.ts` và `src/actions/department.ts`; schema input tại `src/lib/validations/`. Không trả bản ghi tài khoản có mật khẩu băm ra client.

## 5. Ranh giới hồ sơ và truy cập

- HR MANAGE chỉ sửa hồ sơ. `/accounts` kiểm tra ACCOUNTS MANAGE, `/roles` kiểm tra ROLES VIEW/MANAGE; gán role/sửa tài khoản vượt quyền bị chặn trừ người có ROLES MANAGE.
- Không trả password/hash/legacy profile trong payload action hoặc audit. Khi tạo/sửa tài khoản kiểm tra người và role cùng công ty; khóa tài khoản không cập nhật nhan_su.
- Đăng nhập username duy nhất, không đăng nhập mã nhân viên. Sửa tài khoản hoặc mật khẩu tăng phien_ban_dang_nhap (trường DB; JWT dùng sessionVersion) để thu hồi phiên cũ.
- Thay đổi dữ liệu và audit phải cùng transaction cho luồng nhân sự/tài khoản mới.

## 6. HR độc lập — 28/10/2026

- Mọi trường hồ sơ nghiệp vụ có thể sửa bởi HR MANAGE dù có nguồn HR/1Office; nguồn chỉ là lịch sử nhập.
- Schema input strict không nhận employeeCode, companyId hoặc metadata nguồn. Các trường cấp tài khoản tùy chọn có guard riêng theo quy tắc 04/11/2026. Mã do DB cấp và không cập nhật; phòng ban bắt buộc cùng công ty. Ghi chú vận hành là notes, không sửa hrNotes gốc qua form.
- Không chạy lại importer snapshot lên hồ sơ vận hành. Seed phải idempotent và không tái sinh hồ sơ/tài khoản đã dọn.

## 7. Cơ cấu độc lập — 03/11/2026

- HR MANAGE được tạo, sửa tên/mã/mô tả/parent và xóa phòng ban rỗng. HR VIEW chỉ đọc. Không chặn theo externalSystem và không dựng DTO đối soát nguồn.
- Input strict; xác minh parent cùng công ty, không tự trỏ hoặc tạo chu trình; mutation và audit cùng transaction, khóa theo công ty khi sửa cây. Xóa còn kiểm tra con/nhân sự và khóa hàng phòng ban.
- Revalidate danh sách, danh bạ, tài khoản, 3D và tổng quan sau thay đổi. Không tự sửa vị trí 3D hoặc gán head/role từ tên/chức danh.
