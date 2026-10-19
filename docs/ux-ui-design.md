# Định hướng UX/UI Couple App

## 1. Mục tiêu thiết kế

Thiết kế của Couple App không cần cầu kỳ hoặc tạo cảm giác như một sản phẩm thời trang cao cấp. Giao diện cần đạt bốn mục tiêu:

- Dễ hiểu ngay khi mở lần đầu.
- Hai avatar luôn là điểm nhấn chính.
- Gửi một interaction trong vài giây.
- Tạo cảm giác ấm áp nhưng không quá trẻ con hoặc quá nhiều màu hồng.

## 2. Phong cách

Phong cách được chọn là **pastel ấm, tối giản**.

Đặc điểm:

- Nền sáng màu kem thay vì trắng lạnh.
- Card và button bo tròn vừa phải.
- Màu nhấn hồng san hô kết hợp cam kem.
- Icon nét tròn, đơn giản.
- Ít hiệu ứng trang trí, tránh nhiều gradient và đổ bóng nặng.
- Animation ngắn, vui và có phản hồi rõ ràng.

## 3. Design tokens đề xuất

Đây là giá trị khởi đầu, có thể điều chỉnh sau khi có asset avatar thật.

### Màu sắc

| Token | Giá trị | Mục đích |
|---|---|---|
| `color.background` | `#FFF8F2` | Nền ứng dụng |
| `color.surface` | `#FFFFFF` | Card, sheet và input |
| `color.primary` | `#C34F62` | CTA chính và điểm nhấn; đạt contrast với chữ trắng |
| `color.primaryPressed` | `#A63A50` | Trạng thái nhấn |
| `color.secondary` | `#F7C59F` | Điểm nhấn phụ |
| `color.accent` | `#FFD6A5` | Badge và decoration nhẹ |
| `color.textPrimary` | `#3D3232` | Nội dung chính |
| `color.textSecondary` | `#796B6B` | Nội dung phụ |
| `color.border` | `#EEDFD7` | Border nhẹ |
| `color.success` | `#79B89A` | Thành công |
| `color.warning` | `#DFA85A` | Cảnh báo |
| `color.danger` | `#B33A3A` | Hành động nguy hiểm; đạt contrast với chữ trắng |
| `color.overlay` | `rgba(61, 50, 50, 0.36)` | Nền modal |

### Typography

MVP ưu tiên system font để giảm setup và đảm bảo hỗ trợ tiếng Việt tốt.

| Style | Kích thước | Weight | Dùng cho |
|---|---:|---:|---|
| Display | 32 | 700 | Số ngày bên nhau hoặc tiêu đề đặc biệt |
| Heading 1 | 24 | 700 | Tiêu đề màn hình |
| Heading 2 | 20 | 600 | Tiêu đề section |
| Body | 16 | 400 | Nội dung chính |
| Body small | 14 | 400 | Nội dung phụ |
| Label | 14 | 600 | Button và tab |
| Caption | 12 | 400 | Timestamp và helper text |

Không dùng quá ba weight trong một màn hình.

### Khoảng cách

Sử dụng hệ 4 điểm:

| Token | Giá trị |
|---|---:|
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |

### Border radius

| Token | Giá trị | Dùng cho |
|---|---:|---|
| `radius.small` | 8 | Chip và badge |
| `radius.medium` | 12 | Input và button |
| `radius.large` | 20 | Card và bottom sheet |
| `radius.round` | 999 | Avatar, icon button |

### Shadow

Chỉ dùng một shadow nhẹ cho thành phần nổi. Không dùng nhiều tầng shadow.

```text
offset: 0 4
blur: 16
opacity: 0.08
color: #3D3232
```

### Nguồn token duy nhất

Khi bắt đầu code, tất cả token màu phải được khai báo tại một module tập trung như `src/theme/colors.ts`. Component và screen chỉ import token, không hardcode mã hex riêng. Quy tắc tương tự áp dụng cho spacing, radius và typography.

## 4. Điều hướng

Pilot sử dụng bottom tabs với hai mục:

1. **Phòng chung**: màn hình chính và interaction.
2. **Cài đặt**: avatar, notification và mối quan hệ.

Màn hình lịch sử interaction chỉ được thêm ở phase sau nếu pilot cho thấy người dùng cần xem lại.

Trong onboarding không hiển thị bottom tabs. Người dùng phải hoàn thành hồ sơ và pairing trước khi vào ứng dụng chính.

## 5. Cấu trúc màn hình

### 5.1 Splash

Mục đích:

- Kiểm tra session.
- Tải cấu hình tối thiểu.
- Điều hướng tới auth, onboarding, pairing hoặc phòng chung.

Không giữ splash chỉ để trình diễn animation dài.

### 5.2 Đăng ký và đăng nhập

```text
┌──────────────────────────┐
│                          │
│        Couple App        │
│  Một góc nhỏ cho hai người│
│                          │
│  [ Email               ] │
│                          │
│  [     Gửi mã OTP      ] │
│                          │
│  Nhập mã đã gửi tới email │
└──────────────────────────┘
```

Nguyên tắc:

- Một CTA chính.
- Lỗi email hoặc OTP hiển thị gần input liên quan.
- Không yêu cầu quá nhiều thông tin trước khi người dùng thấy giá trị sản phẩm.
- Production không hiển thị password login. Local development dùng mail viewer hoặc cơ chế test tách biệt.

### 5.3 Tạo avatar

```text
┌──────────────────────────┐
│  Tạo nhân vật của bạn    │
│                          │
│         [ AVATAR ]       │
│                          │
│  Da  Tóc  Mắt  Áo  Phụ kiện│
│  ○   ○   ○   ○   ○       │
│                          │
│  [       Hoàn tất      ] │
└──────────────────────────┘
```

Avatar preview luôn hiển thị ở nửa trên. Danh sách lựa chọn dùng horizontal list, không mở nhiều modal lồng nhau.

### 5.4 Ghép đôi

Hai lựa chọn rõ ràng:

- Tạo mã và gửi cho người yêu.
- Nhập mã đã nhận.

Mã mời cần dễ đọc, dễ copy và có ngày hết hạn. Không hiển thị thông tin nhạy cảm của người tạo trước khi người nhập mã xác nhận.

### 5.5 Phòng chung

```text
┌──────────────────────────┐
│  128 ngày bên nhau    ⚙  │
│                          │
│      ┌────────────┐      │
│      │            │      │
│      │  A      B  │      │
│      │ avatar avatar     │
│      │            │      │
│      └────────────┘      │
│                          │
│  Chạm vào nhân vật để    │
│  gửi một tương tác       │
│  Mood:  Vui  Giận  Buồn  │
│                          │
│       Phòng       Cài đặt │
└──────────────────────────┘
```

Yêu cầu:

- Avatar chiếm phần lớn diện tích hữu dụng.
- Không đặt nhiều CTA cạnh avatar.
- Hint chỉ xuất hiện khi người dùng mới hoặc chưa tương tác trong một khoảng thời gian.
- Khi chạm đúng hitbox, hiển thị phản hồi tức thời trước khi request hoàn thành.
- Nếu request thất bại, hoàn tác trạng thái gửi và hiển thị nút thử lại.
- Mood hiện tại phải có label và icon, không chỉ biểu thị bằng màu hoặc nét mặt.
- Khi user đổi mood lần đầu, hiển thị giải thích rằng cùng một vùng chạm có thể tạo action khác.

### 5.6 Interaction help sheet

Client không cho user chọn trực tiếp resolved action như `HEAD_PAT` hoặc `BONK`. User chọn mood rồi thực hiện intent/gesture; backend resolve action authoritative.

Help sheet chỉ giải thích mapping hiện tại:

```text
┌──────────────────────────┐
│ Mood hiện tại: Giận      │
│                          │
│ Chạm đầu  → Gõ đầu       │
│ Kéo gần   → Ôm           │
│ Chạm miệng→ Đói          │
│ Chạm tim  → Nhớ          │
└──────────────────────────┘
```

Không dùng long press làm cách duy nhất để khám phá mapping vì khó nhận biết.

### 5.7 Lịch sử interaction - phase sau

Mỗi item gồm:

- Icon action.
- Người gửi.
- Nội dung ngắn.
- Thời gian tương đối.
- Không hiển thị trạng thái đã xem cho người gửi.
- Không tạo reply thread trong MVP.

Không biến màn hình này thành chat timeline trong MVP.

### 5.8 Cài đặt

Các section:

- Hồ sơ và avatar.
- Notification.
- Action được phép.
- Quiet hours.
- Quyền riêng tư.
- Mối quan hệ.
- Tài khoản.

Hành động ngắt ghép đôi, vô hiệu hóa tài khoản và xóa hoàn toàn phải nằm ở cuối, dùng màu danger và yêu cầu xác nhận. UI phải giải thích rõ vô hiệu hóa có thể restore nhưng xóa hoàn toàn thì không.

- Unmatch: kết thúc couple, ẩn partner ngay và xóa interaction sau 10 ngày.
- Deactivate: tạm ẩn account vô thời hạn, có thể restore bất cứ lúc nào.
- Delete: xóa vĩnh viễn account và interaction liên quan.

## 6. Thiết kế avatar MVP

### Layer đề xuất

```text
1. shadow
2. body
3. skin
4. outfit
5. face
6. eyes
7. mouth
8. hair_back
9. hair_front
10. accessory
11. effect
```

Mỗi asset phải tuân theo cùng kích thước canvas, origin và naming convention.

Asset manifest V1 được đóng gói trong app. Mỗi asset có ID ổn định và provenance record để theo dõi nguồn/giấy phép.

Ví dụ naming:

```text
skin_01.svg
hair_short_01_front.svg
hair_short_01_back.svg
eyes_round_01.svg
mouth_smile_01.svg
outfit_casual_01.svg
```

### Animation MVP

Ưu tiên animation bằng transform và opacity:

- Xoa đầu: avatar hạ nhẹ theo trục Y và xuất hiện tim.
- Chọc má: scale X ngắn ở vùng mặt.
- Bonk: rung ngang nhẹ và xuất hiện ngôi sao.
- Hôn: dấu hôn fade in, scale up rồi fade out.
- Ôm: hai avatar translate lại gần nhau.
- Đói: miệng đổi sprite, avatar nhún nhẹ.
- Nhớ: tim xuất hiện từ avatar người gửi và bay sang avatar đối phương.
- Buồn ngủ: mắt đổi sprite và chữ `Z` bay lên.
- Đẩy ra: hai avatar tách xa nhau, avatar người gửi giữ biểu cảm buồn.

Sau animation, avatar có thể hiển thị một câu phản ứng đã cấu hình và dịch sẵn như "Á!", "Đau nha" hoặc "Haha". Người dùng không nhập nội dung tự do.

### Mood selector

V1 có ba mood:

- `happy`: vui.
- `angry`: giận.
- `sad`: buồn.

Cùng một thao tác chạm đầu partner tạo action khác nhau theo mood của người gửi. Mood của người nhận không ảnh hưởng:

- `happy → HEAD_PAT`
- `angry → BONK`
- `sad → PUSH_AWAY`

UI phải có help sheet để user xem mapping hiện tại thay vì bắt họ tự đoán.

Trên thiết bị người nhận, avatar của người gửi phải là nhân vật chủ động thực hiện action. Ví dụ A đang angry và chạm đầu B thì avatar A đổi sang mặt angry rồi gõ đầu avatar B; avatar B chỉ chạy reaction animation.

Mỗi animation nên kéo dài khoảng 400-1200 ms. Không khóa điều hướng trong thời gian animation.

## 7. Component cơ bản

### Button

- Primary: nền primary, text trắng.
- Secondary: nền surface, border primary, text primary.
- Ghost: không nền, chỉ dùng cho action phụ.
- Danger: dùng cho ngắt ghép đôi và xóa tài khoản.
- Chiều cao tối thiểu 48 px.

### Input

- Label luôn hiển thị, không chỉ phụ thuộc placeholder.
- Border rõ ở focus và error.
- Helper text đặt ngay dưới input.
- Vùng chạm đủ lớn cho icon hiện/ẩn mật khẩu.

### Card

- Nền surface.
- Radius lớn.
- Padding tối thiểu 16 px.
- Chỉ dùng shadow khi cần phân lớp với background.

### Bottom sheet

- Dùng cho intent/help sheet và lựa chọn ngắn.
- Có title và nút đóng rõ ràng.
- Không lồng bottom sheet bên trong bottom sheet.

### Toast

- Dùng cho xác nhận không quan trọng như copy mã mời.
- Lỗi cần người dùng xử lý phải nằm trong màn hình hoặc alert, không chỉ dùng toast.

## 8. Trạng thái bắt buộc

Mỗi màn hình có dữ liệu từ server phải thiết kế:

- Loading lần đầu.
- Refresh.
- Empty.
- Error có thể retry.
- Offline.
- Success.
- Permission denied nếu session hoặc quan hệ không hợp lệ.

Màn hình phòng chung khi offline vẫn hiển thị avatar từ cache nhưng phải báo rõ interaction chưa thể gửi.

## 9. Accessibility

- Vùng chạm tối thiểu 44 x 44 px.
- Không dùng màu sắc làm dấu hiệu duy nhất.
- Button và vùng tương tác phải có accessibility label.
- Animation lặp vô hạn phải tôn trọng tùy chọn giảm chuyển động của hệ điều hành.
- Text quan trọng phải hỗ trợ font scaling.
- Contrast của text chính phải đủ đọc trên nền kem và surface.
- Cung cấp intent button tương đương gesture cho accessibility; button gửi region/gesture intent, không gửi resolved action code.

## 10. Nội dung và tone of voice

Tone:

- Thân thiện.
- Ngắn.
- Không phán xét.
- Không quá trẻ con.
- Không dùng ngôn ngữ tạo cảm giác tội lỗi.

Nên dùng:

- "Minh đang nhớ bạn."
- "Bạn muốn phản hồi thế nào?"
- "Hiện chưa thể gửi. Thử lại nhé."

Không nên dùng:

- "Bạn đã bỏ quên người yêu 3 ngày."
- "Nếu yêu thật lòng, hãy phản hồi ngay."
- "Người yêu đang online nhưng chưa trả lời bạn."

### i18n

- `vi` là locale đầu tiên.
- `en` là fallback locale.
- Mọi nội dung UI, notification và câu phản ứng phải dùng localization key.
- Không hardcode tiếng Việt hoặc tiếng Anh trong component.
- Mọi key mới phải có bản dịch tiếng Anh trước khi merge.
- Nếu thiếu bản dịch tiếng Việt, app fallback sang tiếng Anh thay vì hiển thị raw key.

## 11. Những thứ không cần thiết kế trong MVP

- Dark mode riêng.
- Theme tùy chỉnh sâu.
- Hiệu ứng nền 3D.
- Nhiều phòng hoặc bản đồ.
- Shop và màn hình thanh toán.
- Feed cộng đồng.
- Bộ sưu tập hàng trăm item.
- Dashboard số liệu tình yêu.

## 12. Checklist trước khi code một màn hình

- Màn hình có một mục tiêu chính rõ ràng.
- CTA chính dễ nhận biết.
- Có loading, empty và error state.
- Có hành vi khi offline nếu liên quan.
- Có accessibility label cho action quan trọng.
- Không phụ thuộc vào gesture ẩn.
- Không có nội dung gây áp lực cho người dùng.
- Component và màu sắc tuân theo token trong tài liệu này.
