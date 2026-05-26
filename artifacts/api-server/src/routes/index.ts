import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchesRouter from "./matches";
import teamsRouter from "./teams";
import streamsRouter from "./streams";
import highlightsRouter from "./highlights";
import statsRouter from "./stats";
import tournamentsRouter from "./tournaments";
import eventsRouter from "./events";
import lineupRouter from "./lineup";
import adminAuthRouter from "./admin-auth";
import squadRouter from "./squad";

const router: IRouter = Router();

router.use(adminAuthRouter);
router.use(squadRouter);
router.use(healthRouter);
router.use(matchesRouter);
router.use(teamsRouter);
router.use(streamsRouter);
router.use(highlightsRouter);
router.use(statsRouter);
router.use(tournamentsRouter);
router.use(eventsRouter);
router.use(lineupRouter);

export default router;
