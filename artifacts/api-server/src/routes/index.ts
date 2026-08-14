import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import listingsRouter from "./listings";
import escrowRouter from "./escrow";
import conversationsRouter from "./conversations";
import notificationsRouter from "./notifications";
import reviewsRouter from "./reviews";
import addressesRouter from "./addresses";
import shippingRouter from "./shipping";
import storageRouter from "./storage";
import paymentsRouter from "./payments";
import favoritesRouter from "./favorites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(listingsRouter);
router.use(escrowRouter);
router.use(conversationsRouter);
router.use(notificationsRouter);
router.use(reviewsRouter);
router.use(addressesRouter);
router.use(shippingRouter);
router.use(storageRouter);
router.use(paymentsRouter);
router.use(favoritesRouter);

export default router;
