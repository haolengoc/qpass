"use client";

import NextLink, { type LinkProps, useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import { NavigationIndicator } from "@/components/ui/navigation-indicator";

function PendingNavigation() {
  const { pending } = useLinkStatus();

  // The portal keeps the indicator outside links and transformed cards.
  // Link pending state is always false during server rendering.
  return pending ? createPortal(<NavigationIndicator />, document.body) : null;
}

export default function Link<RouteType>({ children, ...props }: LinkProps<RouteType>) {
  return (
    <NextLink {...props}>
      {children}
      <PendingNavigation />
    </NextLink>
  );
}
