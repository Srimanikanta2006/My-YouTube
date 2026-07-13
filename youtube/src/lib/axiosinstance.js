import axios from "axios";

const rawBaseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:5000";

const baseURL = rawBaseURL.replace(/\/$/, "");

const axiosInstance = axios.create({
  baseURL,
});

export default axiosInstance;