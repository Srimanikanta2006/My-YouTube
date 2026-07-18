export const getBackendUrl = () => {
  const envURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  if (typeof window !== "undefined") {
    try {
      const currentHost = window.location.hostname;
      const urlObj = new URL(envURL);
      urlObj.hostname = currentHost;
      return urlObj.toString().replace(/\/$/, "");
    } catch (e) {
      // Fallback
    }
  }
  return envURL.replace(/\/$/, "");
};

export const getWsUrl = () => {
  const backendUrl = getBackendUrl();
  return backendUrl.replace(/^http/, "ws");
};
