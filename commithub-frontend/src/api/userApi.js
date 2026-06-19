import api from "./axios";

export const getUserProfile = async(id)=>{

    const response = await api.get(
        `/users/profile/${id}`
    );

    return response.data;
};