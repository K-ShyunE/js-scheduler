import { z } from "zod";

export const scheduleDraftSchema = z.object({
  productName: z.string().min(1, "상품명을 입력해주세요."),
  brandName: z.string().optional(),
  partnerId: z.string().min(1, "업체를 선택해주세요."),
  channelId: z.string().min(1, "홈쇼핑 채널을 선택해주세요."),
  saleDate: z.string().min(1, "판매일을 입력해주세요."),
  saleStartTime: z.string().min(1, "판매 시작 시간을 입력해주세요."),
  saleEndTime: z.string().optional(),
  shipmentDate: z.string().optional(),
  quantity: z.coerce.number().int().nonnegative("수량은 0 이상이어야 합니다."),
  memo: z.string().optional(),
});

export type ScheduleDraftInput = z.infer<typeof scheduleDraftSchema>;

