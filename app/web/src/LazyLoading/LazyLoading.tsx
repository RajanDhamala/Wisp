
import { lazy } from "react";

export const LazyLandingPage = lazy(() => import("../Pages/LandingPage.tsx"));
export const LazyLoginPage = lazy(() => import("../Auth/LoginPage.tsx"));
export const LazyTestPage = lazy(() => import("../Pages/Testpage.tsx"));
export const LazySessionPage = lazy(() => import("../Pages/ChatPage.tsx"));
