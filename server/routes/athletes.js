import { Router } from "express";
import { listAthleteSessions } from "./sessions.js";

const router = Router();
router.get("/:athleteId/sessions", listAthleteSessions);
export default router;
