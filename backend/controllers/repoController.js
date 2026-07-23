import Repository from "../models/repoModel.js";
export const starRepository = async(req,res)=>{}
export const unstarRepository = async(req,res)=>{}
/* create repository */
export const createRepository = async (req, res) => {
    try {
        const { name, description, visibility } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Repository name is required"
            });
        }

        const existingRepo = await Repository.findOne({
            name,
            owner: req.user._id
        });

        if (existingRepo) {
            return res.status(400).json({
                message: "Repository already exists"
            });
        }

        const repository = await Repository.create({
            name,
            description,
            visibility,
            owner: req.user._id,
            branches: ["main"]
        });

        res.status(201).json(repository);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

/* get repositories */
// export const getRepositories = async (req, res) => {
//     try {
//         const repositories = await Repository.find({
//             owner: req.user._id
//         }).sort({
//             createdAt: -1
//         });

//         res.status(200).json(repositories);
//     } catch (error) {
//         res.status(500).json({
//             message: error.message
//         });
//     }
// };
export const getRepositories = async (req, res) => {
    try {
        console.log("===== getRepositories CALLED =====");
        console.log("req.user =", req.user);

        const repositories = await Repository.find({
            owner: req.user._id
        });

        console.log("repositories =", repositories);

        return res.status(200).json(repositories);

    } catch (error) {
        console.error("getRepositories ERROR:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};
//fetch repo by id
export const getRepositoryById = async (req,res) => {
    try{
        const repository = await Repository.findOne({
            _id: req.params.id,
            owner: req.user._id // so here now only user a can access it a all repo not of user b repo
        })
        if(!repository){
            return res.status(404).json({
                message:"Repository not found"
            })
        }
        res.status(200).json(repository);
    }catch(error){
        res.status(500).json({
            message:error.message
        });
    }
}