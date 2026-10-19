# Mood và Action Matrix

## 1. Mục tiêu

Mood giúp cùng một gesture trên avatar partner tạo ra action khác nhau dựa trên trạng thái hiện tại của người gửi. Cách này làm avatar có tính cách và giảm nhu cầu mở một action picker dài.

MVP không cho người dùng nhập message tự do. Action tạo animation, notification và một câu phản ứng cấu hình sẵn trong speech bubble của avatar.

## 2. Mood mặc định

| Mood | Ý nghĩa | Biểu cảm avatar |
|---|---|---|
| `happy` | Vui vẻ, gần gũi | Mắt vui, miệng cười |
| `angry` | Đang giận hoặc muốn trêu mạnh hơn | Mày cau, hiệu ứng giận nhẹ |
| `sad` | Buồn, muốn giữ khoảng cách | Mắt buồn, tư thế khép lại |

Quy tắc V1:

- Mood mặc định khi tạo account là `happy`.
- User chủ động đổi mood.
- Mood không tự hết hạn.
- Mood được đồng bộ realtime để partner thấy đúng biểu cảm avatar.
- Không tạo lịch sử mood trong V1.

## 3. Ai quyết định action?

Mood của **người gửi** quyết định action. Mood của người nhận không tham gia vào quá trình resolve.

Ví dụ User A đang `angry`, sau đó A chạm vào đầu avatar của B trên thiết bị của A:

```text
actor: A
actor mood: angry
target: B
target region: head
resolved action: BONK
```

Khi interaction được phát trên thiết bị của B:

1. Avatar A là actor.
2. Avatar A chuyển sang khuôn mặt `angry`.
3. Avatar A thực hiện animation gõ vào đầu avatar B.
4. Avatar B là target và chạy reaction animation tương ứng.

Giới tính hoặc mood của B không làm thay đổi resolved action.

## 4. Mapping vùng đầu đã chốt

| Mood người gửi | Gesture trên máy người gửi | Action | Actor animation trên máy người nhận | Target reaction | Speech bubble mặc định |
|---|---|---|---|---|---|
| `happy` | Chạm đầu partner | `HEAD_PAT` | Avatar người gửi vui và xoa đầu target | Target hạ đầu nhẹ, tim nhỏ | `reaction.headPat.default` |
| `angry` | Chạm đầu partner | `BONK` | Avatar người gửi đổi mặt angry và gõ đầu target | Target rung nhẹ, hiệu ứng ngôi sao | `reaction.bonk.default` |
| `sad` | Chạm đầu partner | `PUSH_AWAY` | Avatar người gửi đổi mặt sad và đẩy target ra | Target lùi ra xa | `reaction.pushAway.default` |

## 5. Nội dung mặc định

Các nội dung dưới đây là default copy để bắt đầu. Chúng có thể được điều chỉnh mà không đổi action contract.

| Localization key | `vi` | `en` fallback |
|---|---|---|
| `reaction.headPat.default` | `Hehe` | `Hehe` |
| `reaction.bonk.default` | `Á! Đau nha.` | `Ow! That hurt.` |
| `reaction.pushAway.default` | `Cho mình yên một chút nhé.` | `Please give me a little space.` |

Speech bubble là nội dung do app cấu hình, không phải message do user nhập.

## 6. Mapping Phase 1 ngoài vùng đầu

Các action sau giữ mapping cố định trong Phase 1, chưa phụ thuộc mood:

| Tương tác | Action |
|---|---|
| Kéo hai avatar lại gần | `HUG` |
| Chạm miệng avatar của mình | `HUNGRY` |
| Chạm tim avatar của mình | `MISS_YOU` |

Chưa tự định nghĩa mapping khác nhau theo mood cho các vùng này để tránh tạo behavior không được chủ sản phẩm xác nhận.

Phân biệt hai nhóm intent:

- Partner-directed intent: sender chạm/kéo avatar partner; mood sender có thể tham gia resolve.
- Self-state intent: sender chạm avatar của chính mình để báo trạng thái như đói hoặc nhớ; không phụ thuộc mood trong Phase 1.

## 7. Interaction intent

Client gửi intent thay vì tự quyết action cuối cùng:

```json
{
  "targetType": "partner",
  "targetRegion": "head",
  "gesture": "tap",
  "clientEventId": "uuid",
  "clientCreatedAt": "2026-10-18T10:30:00Z"
}
```

Backend xử lý:

1. Xác thực người gửi.
2. Đọc mood hiện tại của người gửi.
3. Resolve action từ mood, region và gesture.
4. Kiểm tra người nhận có tắt resolved action không.
5. Nếu action bị tắt, từ chối trước khi insert.
6. Nếu hợp lệ, lưu resolved action và mood snapshot.
7. Tạo notification delivery jobs.

Client người nhận dùng `sender_id` làm actor/subject avatar. Với partner-directed intent, `receiver_id` là target avatar. Với self-state intent, avatar sender tự biểu diễn trạng thái và receiver chỉ là người quan sát. Không được đảo vai dựa trên account đang mở app.

## 8. Mood snapshot

Interaction lưu mood tại thời điểm gửi để behavior có thể giải thích và debug được ngay cả khi user đổi mood sau đó.

Ví dụ:

```text
actor_mood = angry
target_region = head
action_type = BONK
```

## 9. Notification

Notification dùng resolved action:

| Mode | Ví dụ với `BONK` |
|---|---|
| `generic` | `Bạn vừa nhận một action mới` |
| `sender_only` | `Bạn có tương tác mới từ Minh` |
| `detailed` | `Minh vừa gõ đầu bạn` |

## 10. Accessibility và discoverability

- Màn hình phải cho biết mood hiện tại của user.
- Lần đầu đổi mood, app giải thích action có thể thay đổi theo mood.
- Không chỉ dùng màu để biểu thị mood; dùng icon, label và biểu cảm avatar.
- Có action sheet hoặc help sheet liệt kê mapping hiện tại cho người không muốn học bằng thử sai.
- `PUSH_AWAY` phải được mô tả nhẹ nhàng, không tạo cảm giác trừng phạt partner.

## 11. Điểm cần xác nhận sau Phase 1

- Các vùng mặt, má và cơ thể thay đổi thế nào theo từng mood?
- User có thể ẩn mood khỏi partner không?
