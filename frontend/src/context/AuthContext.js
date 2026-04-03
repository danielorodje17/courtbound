import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export function apiRequest(method, url, data = null) {
  return axios({ method, url: `${API}${url}`, ...(data && { data }) });
}
