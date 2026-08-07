import express from "express";
import protect from "../middleware/authmiddleware.js";
import { globalSearch } from "../controllers/searchController.js";

const router = express.Router();

router.get(
    "/",
    protect,
    globalSearch
);

export default router;
