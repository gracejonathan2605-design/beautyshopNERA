"use client";

import { useState } from "react";
import { FlashCountdown } from "@/components/shop/flash-countdown";

export function ProductCardFlash({ endAt }: { endAt: Date | string }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return <FlashCountdown endAt={endAt} onExpired={() => setGone(true)} />;
}
