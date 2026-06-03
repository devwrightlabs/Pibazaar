import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "node:stream";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const uploadUrlSchema = z.object({
  name: z.string().max(255).optional(),
  size: z.number().nonnegative().optional(),
  contentType: z.string().max(255).optional(),
});

/**
 * POST /storage/uploads/request-url (auth required)
 * Returns a presigned PUT URL; the client uploads the file directly to it and
 * then persists the returned `objectPath` (e.g. on a listing's images array).
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = uploadUrlSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid upload metadata" });
      return;
    }
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: parsed.data });
  }),
);

function pipeStorageResponse(response: Response, fetchRes: globalThis.Response) {
  response.status(fetchRes.status);
  fetchRes.headers.forEach((value, key) => response.setHeader(key, value));
  if (fetchRes.body) {
    Readable.fromWeb(fetchRes.body as never).pipe(response);
  } else {
    response.end();
  }
}

/** GET /storage/public-objects/* — unconditionally public assets. */
router.get(
  "/storage/public-objects/*filePath",
  asyncHandler(async (req: Request, res: Response) => {
    const raw = (req.params as Record<string, string | string[]>).filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    pipeStorageResponse(res, await objectStorageService.downloadObject(file));
  }),
);

/** GET /storage/objects/* — uploaded listing media (served to anyone with the path). */
router.get(
  "/storage/objects/*path",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const raw = (req.params as Record<string, string | string[]>).path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectFile = await objectStorageService.getObjectEntityFile(
        `/objects/${wildcardPath}`,
      );
      pipeStorageResponse(res, await objectStorageService.downloadObject(objectFile));
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      throw error;
    }
  }),
);

export default router;
