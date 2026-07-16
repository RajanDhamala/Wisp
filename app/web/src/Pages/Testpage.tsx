import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import useUserStore, {
  CURRENT_USER_QUERY_KEY,
  type CurrentUser,
} from "../UserStore";
import { API_BASE_URL } from "../Utils/ApiConfig";

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

const TestPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);

  const { isPending, mutate } = useMutation<CurrentUser, Error, string>({
    mutationKey: ["oauth", "callback"],
    mutationFn: async (oauthToken) => {
      const params = new URLSearchParams({ token: oauthToken });
      const response = await fetch(
        `${API_BASE_URL}/oauth/callback?${params.toString()}`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      const body = (await response.json().catch(() => null)) as
        | ApiEnvelope<CurrentUser>
        | null;

      if (!response.ok || !body?.data) {
        throw new Error(body?.message || "Could not complete login");
      }

      return body.data;
    },
    onSuccess: (user) => {
      setCurrentUser(user);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
      toast.success("Logged in successfully");
      navigate("/session", { replace: true });
    },
    onError: (error) => {
      toast.error(error.message);
      navigate("/login", { replace: true });
    },
  });

  useEffect(() => {
    if (!token) {
      toast.error("The login callback did not include a token");
      navigate("/login", { replace: true });
      return;
    }

    mutate(token);
  }, [mutate, navigate, token]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-2xl font-semibold">Completing your login</h1>
      <p className="text-gray-500 mt-2">
        {isPending ? "Connecting your account…" : "Redirecting…"}
      </p>
    </div>
  );
};

export default TestPage;
