import { useState } from "react";

const Login = ()=>{
    
    const [formData,setFormData] = useState({
        emailphone:""
    })
    
    const handleChange = (e) =>{
        const {name ,value } = e.target;
        setFormData((prev)=>({
            ...prev,
            [name]:value
        }));
    }
    const handleSubmit = (e) =>{
        e.preventDefault();
    }
    
    return(
        <div className="page">
            
            <form
                className="form"
                onSubmit={handleSubmit}
            >
               <div className="emailphone">
                        <div className="input-group">
                            <input
                                type="text"
                                name="firstname"
                                value={formData.firstname}
                                onChange={handleChange}
                                required
                            />
                            <label>
                                Email or Phone Number
                            </label>
                        </div>
                </div>
                 <button
                        className="btn"
                        type="submit"
                    >
                        Continue
                 </button>
            </form>
        </div>
    );
}

export default Login;
