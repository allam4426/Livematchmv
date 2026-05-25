import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matchesRouter from "./matches";
import teamsRouter from "./teams";
import streamsRouter from "./streams";
import highlightsRouter from "./highlights";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchesRouter);
router.use(teamsRouter);
router.use(streamsRouter);
router.use(highlightsRouter);
router.use(statsRouter);

export default router;
