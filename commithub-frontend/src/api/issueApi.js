import api from "./axios";

export const getIssues = async(repoId)=>{
    const response = await api.get(`/issues/repository/${repoId}`);
    return response.data;
}
export const createIssue = async (repoId,issueData)=>{
    const response = await api.post(`/issues/repository/${repoId}`,issueData);
    return response.data;   
}
export const closeIssue = async (issueId)=>{
    const response = await api.patch(`/issues/${issueId}/close`);
    return response.data;
}
export const reopenIssue = async (issueId)=>{
    const response = await api.patch(`/issues/${issueId}/reopen`);
    return response.data;
}