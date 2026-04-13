import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all app routes except Next internals/assets so locale redirects
  // also work for unprefixed paths like /shop or /checkout.
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
