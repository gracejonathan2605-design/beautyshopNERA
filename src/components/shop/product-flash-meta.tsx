"use client";

import { useState } from "react";
import { FlashCountdown } from "@/components/shop/flash-countdown";
import { ProductBadges } from "@/components/shop/product-badges";

export function ProductFlashMeta({
  flash,
  flashEndAt,
  promoPercent,
  isPromo,
  isNew,
}: {
  flash: boolean;
  flashEndAt?: Date | string | null;
  promoPercent: number;
  isPromo?: boolean;
  isNew?: boolean;
}) {
  const [gone, setGone] = useState(false);
  const showFlash = flash && !gone;
  return (
    <>
      <div className="mt-3">
        <ProductBadges flash={showFlash} promoPercent={promoPercent} isPromo={isPromo} isNew={isNew} />
      </div>
      {showFlash && flashEndAt ? <FlashCountdown endAt={flashEndAt} onExpired={() => setGone(true)} /> : null}
    </>
  );
}
