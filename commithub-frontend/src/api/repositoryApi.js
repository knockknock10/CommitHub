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