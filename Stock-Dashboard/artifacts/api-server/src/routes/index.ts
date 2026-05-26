import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import materialsRouter from "./materials";
import toolsRouter from "./tools";
import materialRequestsRouter from "./material-requests";
import toolRequestsRouter from "./tool-requests";
import stockMovementsRouter from "./stock-movements";
import suppliersRouter from "./suppliers";
import purchaseOrdersRouter from "./purchase-orders";
import reportsRouter from "./reports";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(materialsRouter);
router.use(toolsRouter);
router.use(materialRequestsRouter);
router.use(toolRequestsRouter);
router.use(stockMovementsRouter);
router.use(suppliersRouter);
router.use(purchaseOrdersRouter);
router.use(reportsRouter);
router.use(usersRouter);

export default router;
