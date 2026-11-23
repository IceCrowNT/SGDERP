# Office web cho chat ERP

Tích hợp ONLYOFFICE Docs tự lưu trữ; không cần Microsoft Office trên máy người dùng. Word/DOCX và Excel/XLSX chỉnh trực tiếp trong panel; PDF/CSV xem. Tệp mới được lưu riêng trong cuộc chat, giữ nguồn. Không gửi tài liệu tới dịch vụ demo của nhà cung cấp.

## Chạy thử trên máy hiện tại

1. Mac hiện tại dùng Lima vì macOS 13 không còn được Docker Desktop mới hỗ trợ. Khởi động VM bằng `~/.local/bin/limactl start sdg-office` nếu chưa chạy. Script nhận Docker tại `~/.local/bin` và context `lima-sdg-office`, không đổi context mặc định. Máy Mac khác có thể dùng Docker Desktop phiên bản hỗ trợ hệ điều hành đó.
2. Tại thư mục ERP chạy `node deploy/office/start-local.mjs`.
3. Script tạo khóa ngẫu nhiên trong `.env.office`, bổ sung cấu hình Office vào `.env.local` nếu chưa có, rồi chạy Compose và chờ tối đa 10 phút tới khi job font/cache kết thúc, healthcheck trả true. Hết thời gian chỉ báo lỗi, giữ container để kiểm tra. Các file `.env.*` nằm ngoài Git; không in khóa ra log. Nếu đã cấu hình Office, script giữ nguyên và yêu cầu đối chiếu khóa.
4. Khi container khởi động, Office tạo font/theme/JS cache rồi tự restart dịch vụ (trên Mac hiện tại có thể mất vài phút); chờ `docker logs --tail 20 office-office-1` báo tạo cache xong/reload nginx, sau đó `http://localhost:8088/healthcheck` trả `true`. Healthcheck có thể true trước bước chuẩn bị này. Tải lại trang ERP; nếu dev server chưa nhận biến mới thì khởi động lại dev server. Với Lima, dùng Docker binary/context như hướng dẫn dưới.
5. Mở cuộc chat có DOCX/XLSX → nhấp tên tệp → chỉnh sửa → **Lưu bản mới**. Chỉ đóng khi ERP xác nhận đã lưu. File mới xuất hiện trong chat, có thể gửi yêu cầu AI dựa trên bản mới. Menu Tệp trong editor cho tải/xuất các định dạng editor hỗ trợ; file tải trực tiếp từ editor chưa tự thành tệp đính kèm ERP.

Đã kiểm chứng local trên Mac Intel: mở/sửa/lưu Word và Excel, công thức, mở lại bản mới và xuất PDF. Sau khởi động lại Mac chạy bước 1–2; chưa bật tự mở VM lúc đăng nhập.

Dịch vụ có volume dữ liệu/cache/log riêng, chỉ mở cổng 8088 trên localhost. Với Lima thêm `~/.local/bin/docker --context lima-sdg-office` thay cho `docker` trong các lệnh dưới. Dừng bằng `docker compose --env-file .env.office -f deploy/office/compose.yaml stop`; không dùng `down -v` khi cần giữ tài liệu đang xử lý.

## Máy chủ có sẵn / triển khai LAN

| Biến | Ý nghĩa |
| --- | --- |
| `OFFICE_PUBLIC_URL` | Origin Office mà trình duyệt truy cập, ví dụ `https://office.example.vn` |
| `OFFICE_INTERNAL_URL` | Origin ERP dùng gửi lệnh/tải kết quả; mặc định bằng public URL |
| `OFFICE_APP_URL` | Origin ERP mà Office gọi để đọc nguồn/callback; Docker Desktop dùng `http://host.docker.internal:4000`, Lima dùng `http://host.lima.internal:4000` |
| `OFFICE_JWT_SECRET` | Khóa ngẫu nhiên riêng >=32 ký tự, giống `JWT_SECRET` của dịch vụ; không dùng API key OpenAI |
| `OFFICE_MOBILE_EDIT_ENABLED` | Mặc định false: điện thoại xem; chỉ bật với edition hỗ trợ mobile editing |
| `OFFICE_IMAGE` | Tùy chọn của Compose để chọn edition/version; bản thử pin Community `10.0.0.1` |

Origin không chứa path/query/credential. HTTPS cho cả ERP và Office khi triển khai HTTPS. Hai máy chủ phải truy cập được nhau. Callback ký JWT theo header Authorization (payload) hoặc body; chỉ trường đã ký được sử dụng. Cho phép private IP trong Compose phục vụ ERP local; ở server thật giới hạn mạng/egress đúng các dịch vụ cần thiết và không mở dịch vụ thử ra Internet.

Community có giới hạn kết nối đồng thời, giấy phép AGPL và không có mobile web editing như bản thương mại. Chọn edition/giấy phép trước triển khai cho công ty, giữ nhận diện của nhà cung cấp; connector không tự mua hoặc đăng ký dịch vụ. Tham khảo [edition](https://helpcenter.onlyoffice.com/docs/installation/enterprise/faq), [giấy phép Community](https://helpcenter.onlyoffice.com/docs/installation/community/faq).

## Chuyển từ Mac sang VPS Linux

Dùng cùng `compose.yaml` và mã ERP. Mac chạy container Linux trong VM Lima; VPS Linux chạy Docker Engine trực tiếp. Máy người dùng chỉ cần trình duyệt. Không sao chép binary macOS hoặc `node_modules` sang Linux: cài lại dependencies theo lockfile và build trên VPS. LibreOffice phục vụ công cụ xuất PDF của AI là thành phần riêng, cũng cần cài bản Linux nếu dùng tính năng đó.

1. Cài Docker Engine + Compose plugin theo tài liệu chính thức của bản Linux đang dùng. Chọn kiến trúc image phù hợp CPU; cấu hình local đã thử trên amd64. Windows VPS cần môi trường Linux tương ứng, không chạy trực tiếp image Linux bằng Windows containers.
2. Dành tài nguyên cho Office và ERP/DB riêng: nhà cung cấp nêu tối thiểu Office 2 CPU, RAM 4 GB, 40 GB trống, swap 4 GB. Tăng theo số người dùng/tệp; không coi đây là cấu hình đủ cho toàn ERP. [Yêu cầu ONLYOFFICE](https://helpcenter.onlyoffice.com/docs/installation/community/docker/installing/install).
3. Sao chép `env.vps.example` thành `.env.office` ngoài Git, thay domain/khóa ngẫu nhiên và đặt quyền file 600. Đưa cùng các biến Office vào môi trường backend ERP. `OFFICE_INTERNAL_URL=127.0.0.1` chỉ đúng khi ERP chạy trên host; ERP trong container phải dùng địa chỉ mạng container hoặc public URL.
4. Từ gốc repo chạy `docker compose --env-file .env.office -f deploy/office/compose.yaml up -d`. Không dùng script local để tạo URL localhost cho VPS. Chờ `curl --fail http://127.0.0.1:8088/healthcheck` trả `true`.
5. Reverse proxy domain Office qua HTTPS tới `127.0.0.1:8088`, hỗ trợ WebSocket, chuyển `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`. Dùng [mẫu Nginx chính thức](https://github.com/ONLYOFFICE/document-server-proxy/blob/master/nginx/proxy-https-to-http.conf) và chứng chỉ của đơn vị. Không mở cổng 8088 ra Internet. Cả ERP và Office cần HTTPS hợp lệ; ERP phải gọi được Office và Office phải tải/callback được ERP. Proxy ERP phải bỏ query của `/api/office/` khỏi access/error log; không ghi request body/Authorization.
6. Chuyển DB và kho tệp riêng cùng nhau, giữ cấu hình khóa/kho khóa ERP theo quy trình hiện hành. Nếu còn phiên Office đang sửa, lưu vào ERP trước khi chuyển; backup volume Office nếu cần phục hồi phiên. Không dùng `down -v` để nâng cấp.
7. Khởi động lại ERP, kiểm tra bằng tài khoản thử: mở DOCX/XLSX, sửa/lưu bản mới, tải đúng kết quả; thử tài khoản khác không được đọc tệp; kiểm tra callback qua HTTPS trước khi cho sử dụng.

Mẫu mới là cấu hình triển khai, chưa phải VPS đã chạy. Tên miền, hệ điều hành, CPU và cách chạy ERP của VPS phải được đối chiếu khi triển khai thực tế.

## Vận hành và giới hạn

- Tài liệu vẫn riêng theo tài khoản/công ty/chat; dữ liệu đã gửi tới Office được xử lý trên dịch vụ Office của đơn vị. Không cung cấp chức năng chia sẻ/co-edit giữa người dùng ERP ở đợt này.
- Phiên editor tối đa 8 giờ; kiểm tra tài khoản, phiên bản phiên và nguồn ERP ở từng lần cấp/đọc/lưu. Thu hồi quyền chặn lần đọc/lưu tiếp theo, không thu hồi được phần đã tải vào editor.
- Đồng bộ tới Office không đồng nghĩa lưu vào ERP. Nút **Lưu bản mới** đợi callback và xác nhận DB; lỗi giữ editor mở, tải từ menu Tệp nếu cần phục hồi. Đóng/đổi chat/file bị chặn khi có thay đổi chưa xác nhận; browser refresh có cảnh báo.
- File nguồn bất biến; mỗi lần lưu tạo bản mới. Callback cùng request được chống lặp bằng unique upload UUID. Khi đóng, callback cuối có thể tạo thêm snapshot của dịch vụ. Hai phiên mở cùng nguồn tạo hai nhánh kết quả, không ghi đè nhau.
- Giữ giới hạn có sẵn: 10 MiB/file, 20 file/chat, 200 MiB/tài khoản; bản chỉnh sửa phải vượt qua bộ phân tích tệp của ERP. File quá lớn/nâng cao không phân tích được sẽ không được ghi nhận, editor vẫn giữ để tải xuống.
- Sao lưu DB và `var/ai-attachments` cùng nhau; sao lưu volume Office nếu cần khôi phục phiên đang soạn. Log reverse proxy cần bỏ query `ticket`, không ghi JWT hoặc nội dung callback.
- Bộ kiểm thử mô phỏng giao thức kiểm chứng quyền/lưu/giao diện; **không thay thế kiểm thử với Document Server thật** về font, bảng, công thức, xuất PDF, mất kết nối và phục hồi phiên.

Tài liệu tích hợp: [cấu hình](https://api.onlyoffice.com/docs/docs-api/usage-api/config/), [callback](https://api.onlyoffice.com/docs/docs-api/usage-api/callback-handler/), [lưu](https://api.onlyoffice.com/docs/docs-api/get-started/how-it-works/saving-file/).
