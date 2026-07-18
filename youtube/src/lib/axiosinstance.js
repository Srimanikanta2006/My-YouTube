import axios from "axios";
import { getBackendUrl } from "./urlHelper";

const axiosInstance = axios.create({
  baseURL: getBackendUrl(),
});

if (typeof window !== "undefined") {
  axiosInstance.interceptors.request.use((config) => {
    config.baseURL = getBackendUrl();
    return config;
  });
}

export default axiosInstance;