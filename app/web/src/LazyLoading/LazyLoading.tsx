
import { lazy } from "react";

export const LazyLoginPage = lazy(() => import("../Auth/LoginPage.tsx"));
export const LazyTestPage = lazy(() => import("../Pages/Testpage.tsx"));
export const LazySessionPage = lazy(() => import("../Pages/ChatPage.tsx"));
