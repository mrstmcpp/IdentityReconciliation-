import { Router, Request, Response } from "express";
import { identifyContact } from "../services/identityService";
import { IdentifyRequestBody } from "../types/contactTypes";

export const identifyRouter = Router();

identifyRouter.post("/identify", async (req: Request, res: Response) => {
  try {
    const body = req.body as IdentifyRequestBody;

    // Validate body
    if (body.email === undefined && body.phoneNumber === undefined) {
      return res.status(400).json({
        error: "Request body must contain at least one of: email, phoneNumber",
      });
    }

    const email =
      body.email !== undefined && body.email !== null
        ? String(body.email).trim()
        : null;

    const phoneNumber =
      body.phoneNumber !== undefined && body.phoneNumber !== null
        ? String(body.phoneNumber).trim()
        : null;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "At least one of email or phoneNumber must be non-null",
      });
    }

    const result = await identifyContact(email, phoneNumber);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in /identify:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
