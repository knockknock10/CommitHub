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