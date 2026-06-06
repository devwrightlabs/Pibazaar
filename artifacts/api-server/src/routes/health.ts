import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Health endpoints. The deployment healthcheck probes the API base path
// ("/api"), so the root route must return 200 — otherwise the platform marks
// the deployment unhealthy and the rollout fails. "/api/healthz" is the
// explicit alias.
function ok(_req: unknown, res: { json: (body: unknown) => void }) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}

router.get("/", ok);
router.get("/healthz", ok);

export default router;
