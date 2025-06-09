import express, { Request, Response } from "express";

const graphRouter = express.Router();

graphRouter.post("/track", async (req: Request, res: Response) => {
  console.log("Received request tracking post for tabs data:", req.body);
});

export default graphRouter;
