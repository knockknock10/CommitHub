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