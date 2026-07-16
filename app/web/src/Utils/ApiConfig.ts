const configuredApiUrl =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL;

const browserApiUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8000";

  const port = import.meta.env.VITE_API_PORT || "8000";
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
};

export const API_BASE_URL = (configuredApiUrl || browserApiUrl()).replace(
  /\/$/,
  "",
);

