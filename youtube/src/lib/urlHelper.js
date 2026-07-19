export const getBackendUrl = () => {
  let envURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  if (typeof window !== "undefined") {
    // If frontend is HTTPS, force the backend URL to use HTTPS (except localhost)
    if (window.location.protocol === "https:") {
      envURL = envURL.replace(/^http:/, "https:");
    }
    try {
      const urlObj = new URL(envURL);
      // Only swap hostname if the backend is configured locally (localhost/127.0.0.1)
      // and the website is being accessed via a different local address (like 192.168.x.x)
      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        const currentHost = window.location.hostname;
        if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
          urlObj.hostname = currentHost;
          if (window.location.protocol === "https:") {
            urlObj.protocol = "https:";
          }
        }
      }
      return urlObj.toString().replace(/\/$/, "");
    } catch (e) {
      // Fallback
    }
  }
  return envURL.replace(/\/$/, "");
};

export const getWsUrl = () => {
  const backendUrl = getBackendUrl();
  // Force secure WebSocket wss:// if backend protocol is https://
  return backendUrl.replace(/^http/, "ws");
};
