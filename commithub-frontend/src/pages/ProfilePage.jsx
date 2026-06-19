import { useEffect,useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { getUserProfile } from "../api/userApi";
import "../styles/profile.css";

const ProfilePage = ()=>{

    const { id } = useParams();

    const [user,setUser] =
        useState(null);

    const [loading,setLoading] =
        useState(true);

    useEffect(()=>{

        const loadProfile =
        async()=>{

            try{

                const data =
                await getUserProfile(id);

                setUser(data);

            }catch(err){

                console.log(err);

            }finally{

                setLoading(false);
            }
        };

        loadProfile();

    },[id]);

    if(loading){

        return(
            <DashboardLayout>
                <p>Loading...</p>
            </DashboardLayout>
        );
    }

    return(
        <DashboardLayout>

            <div className="profile-page">

                <div className="profile-header">

                    <h1>
                        {user.userName}
                    </h1>

                    <p>
                        {user.email}
                    </p>

                </div>

                <div className="profile-stats">

                    <div>
                        Repositories
                        <h2>
                            {user.repositories?.length}
                        </h2>
                    </div>

                    <div>
                        Starred
                        <h2>
                            {user.starRepo?.length}
                        </h2>
                    </div>

                    <div>
                        Following
                        <h2>
                            {user.followedUsers?.length}
                        </h2>
                    </div>

                </div>

                <h2>
                    Repositories
                </h2>

                {
                    user.repositories?.map(
                        repo=>(
                            <div
                                key={repo._id}
                            >
                                {repo.name}
                            </div>
                        )
                    )
                }

            </div>

        </DashboardLayout>
    );
};

export default ProfilePage;