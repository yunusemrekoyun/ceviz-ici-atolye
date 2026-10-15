import axios from "axios";

// Storefront reads are identical for every visitor and carry no session data.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  timeout: 20000,
});

export default publicApi;
