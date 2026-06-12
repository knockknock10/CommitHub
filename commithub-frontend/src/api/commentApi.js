import api from "./axios";

export const getComments = async(issueId)=>{
    const response = await api.get(
        `/comments/${issueId}`
    );
    return response.data;
}

export const createComment = async(issueId,data)=>{
    const response = await api.post(
        `/comments/${issueId}`,
        data
    );
    return response.data;
}

export const deleteComment = async(commentId)=>{
    const response = await api.delete(
        `/comments/delete/${commentId}`
    );
    return response.data;
}