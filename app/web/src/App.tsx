import { type ReactNode, Suspense, useEffect } from "react";
import "./index.css";
import {
  LazySessionPage,
  LazyLoginPage,
  LazyTestPage,
} from "./LazyLoading/LazyLoading";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import queryClient from "./Utils/QueryConfig.tsx";
import Loader from "./LazyLoading/Loader.tsx";
import toast, { Toaster } from "react-hot-toast";
import useUserStore, {
  CURRENT_USER_QUERY_KEY,
  type CurrentUser,
} from "./UserStore.tsx";
import { API_BASE_URL } from "./Utils/ApiConfig.ts";
import LandingPage from "./Pages/LandingPage.tsx";
import PricingPage from "./Pages/PricingPage.tsx";

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

const fetchCurrentUser = async (): Promise<CurrentUser | null> => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: "include",
  });

  if (response.status === 401) return null;

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<CurrentUser>
    | null;

  if (!response.ok || !body?.data) {
    throw new Error(body?.message || "Could not check your login session");
  }

  return body.data;
};

const AuthBootstrap = () => {
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const currentUserQuery = useQuery<CurrentUser | null, Error>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!currentUserQuery.isSuccess) return;
    if (currentUserQuery.data) setCurrentUser(currentUserQuery.data);
    else clearCurrentUser();
  }, [
    clearCurrentUser,
    currentUserQuery.data,
    currentUserQuery.isSuccess,
    setCurrentUser,
  ]);

  useEffect(() => {
    if (!currentUserQuery.error) return;
    clearCurrentUser();
    toast.error(currentUserQuery.error.message, { id: "auth-bootstrap-error" });
  }, [clearCurrentUser, currentUserQuery.error]);

  return null;
};

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const authInitialized = useUserStore((state) => state.authInitialized);
  const currentUser = useUserStore((state) => state.currentUser);

  if (!authInitialized) return <Loader />;
  if (!currentUser) return <Navigate replace to="/login" />;
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3_000,
          style: {
            border: "1px solid #27272a",
            borderRadius: "10px",
            fontSize: "13px",
            maxWidth: "360px",
            padding: "8px 12px",
          },
        }}
      />
      <AuthBootstrap />
      <Router>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LazyLoginPage />} />
            <Route path="/register" element={<Navigate replace to="/login" />} />
            <Route path="/callback" element={<LazyTestPage />} />
            <Route
              path="/session/:id?"
              element={
                <RequireAuth>
                  <LazySessionPage />
                </RequireAuth>
              }
            />

            <Route
              path="*"
              element={
                <div className="p-10 text-center text-red-500 font-bold">
                  404 | Page Not Found
                </div>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
