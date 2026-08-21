import api from "./axios";


export const fetchRepositories = async () =>{
    const response = await api.get(
        "/repositories"
    )
    return response.data;
}

export const createRepository  = async(repodata)=>{
    const response = await api.post(
        "/repositories",
        repodata
    )
    return response.data;
}
export const fetchRepositoryById = async(id) =>{
    const response = await api.get(
        `/repositories/${id}`
    )
    return response.data;
}
export const starRepository = async(id)=>{
    const response = await api.patch(
        `/repositories/${id}/star`
    );
    return response.data;
}
export const unstarRepository = async(id)=>{
    const response = await api.patch(
        `/repositories/${id}/unstar`
    );
    return response.data;
}
export const updateRepository = async(id,data)=>{
    const response = await api.patch(
        `/repositories/${id}`,
        data
    );
    return response.data;
}
export const deleteRepository = async(id)=>{
    const response = await api.delete(
        `/repositories/${id}`
    );
    return response.data;
}
export const fetchRepositoryTree = async(id, path = "")=>{
    const response = await api.get(
        `/repositories/${id}/tree`,
        { params: { path } }
    );
    return response.data;
}
export const fetchRepositoryFile = async(id, filePath)=>{
    const response = await api.get(
        `/repositories/${id}/file`,
        { params: { path: filePath } }
    );
    return response.data;
}
export const createRepositoryFile = async(id, path, content)=>{
    const response = await api.post(
        `/repositories/${id}/file`,
        { path, content }
    );
    return response.data;
}
export const updateRepositoryFile = async(id, path, content, expectedHash)=>{
    const response = await api.put(
        `/repositories/${id}/file`,
        { path, content, expectedHash }
    );
    return response.data;
}
export const deleteRepositoryFile = async(id, path)=>{
    const response = await api.delete(
        `/repositories/${id}/file`,
        { params: { path } }
    );
    return response.data;
}
export const createRepositoryDirectory = async(id, path)=>{
    const response = await api.post(
        `/repositories/${id}/directory`,
        { path }
    );
    return response.data;
}
export const deleteRepositoryDirectory = async(id, path)=>{
    const response = await api.delete(
        `/repositories/${id}/directory`,
        { params: { path } }
    );
    return response.data;
}
export const fetchRepositoryBranches = async(id)=>{
    const response = await api.get(
        `/repositories/${id}/branches`
    );
    return response.data;
}
export const fetchRepositoryChanges = async(id)=>{
    const response = await api.get(
        `/repositories/${id}/changes`
    );
    return response.data;
}
export const fetchRepositoryCommits = async(id, limit, offset)=>{
    const response = await api.get(
        `/repositories/${id}/commits`,
        { params: { limit, offset } }
    );
    return response.data;
}
export const fetchRepositoryCommit = async(id, commitId)=>{
    const response = await api.get(
        `/repositories/${id}/commits/${commitId}`
    );
    return response.data;
}
export const createRepositoryCommit = async(id, message)=>{
    const response = await api.post(
        `/repositories/${id}/commits`,
        { message }
    );
    return response.data;
}
export const fetchPullRequests = async(id, params)=>{
    const response = await api.get(
        `/repositories/${id}/pull-requests`,
        { params }
    );
    return response.data;
}
export const fetchPullRequest = async(id, number)=>{
    const response = await api.get(
        `/repositories/${id}/pull-requests/${number}`
    );
    return response.data;
}
export const createPullRequest = async(id, data)=>{
    const response = await api.post(
        `/repositories/${id}/pull-requests`,
        data
    );
    return response.data;
}
export const closePullRequest = async(id, number)=>{
    const response = await api.post(
        `/repositories/${id}/pull-requests/${number}/close`
    );
    return response.data;
}
export const reopenPullRequest = async(id, number)=>{
    const response = await api.post(
        `/repositories/${id}/pull-requests/${number}/reopen`
    );
    return response.data;
}
export const submitPullRequestReview = async(id, number, data)=>{
    const response = await api.post(
        `/repositories/${id}/pull-requests/${number}/reviews`,
        data
    );
    return response.data;
}
export const addPullRequestComment = async(id, number, data)=>{
    const response = await api.post(
        `/repositories/${id}/pull-requests/${number}/comments`,
        data
    );
    return response.data;
}
export const mergePullRequest = async(id, number)=>{
    const response = await api.post(
        `/repositories/${id}/pull-requests/${number}/merge`
    );
    return response.data;
}
export const fetchPullRequestMergeStatus = async(id, number)=>{
    const response = await api.get(
        `/repositories/${id}/pull-requests/${number}/merge-status`
    );
    return response.data;
}
export const fetchPullRequestConflict = async(id, number, path)=>{
    const response = await api.get(
        `/repositories/${id}/pull-requests/${number}/conflicts`,
        { params: { path } }
    );
    return response.data;
}
export const resolvePullRequestConflicts = async(id, number, data)=>{
    const response = await api.post(
        `/repositories/${id}/pull-requests/${number}/conflicts/resolve`,
        data
    );
    return response.data;
}
export const fetchRepositoryTags = async(id, params)=>{
    const response = await api.get(
        `/repositories/${id}/tags`,
        { params }
    );
    return response.data;
}
export const fetchRepositoryTag = async(id, tagName)=>{
    const response = await api.get(
        `/repositories/${id}/tags/${tagName}`
    );
    return response.data;
}
export const createRepositoryTag = async(id, data)=>{
    const response = await api.post(
        `/repositories/${id}/tags`,
        data
    );
    return response.data;
}
export const deleteRepositoryTag = async(id, tagName)=>{
    const response = await api.delete(
        `/repositories/${id}/tags/${tagName}`
    );
    return response.data;
}
export const fetchReleases = async(id, params)=>{
    const response = await api.get(
        `/repositories/${id}/releases`,
        { params }
    );
    return response.data;
}
export const fetchRelease = async(id, releaseId)=>{
    const response = await api.get(
        `/repositories/${id}/releases/${releaseId}`
    );
    return response.data;
}
export const createRelease = async(id, data)=>{
    const response = await api.post(
        `/repositories/${id}/releases`,
        data
    );
    return response.data;
}
export const updateRelease = async(id, releaseId, data)=>{
    const response = await api.patch(
        `/repositories/${id}/releases/${releaseId}`,
        data
    );
    return response.data;
}