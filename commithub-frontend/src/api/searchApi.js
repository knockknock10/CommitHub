import axios from "axios";

export const globalSearch = async (query) => {
    const response = await axios.get(`search?q=${encodeURIComponent(query)}`);
    return response.data;
}