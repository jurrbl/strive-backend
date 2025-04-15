// src/middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import { auth } from "googleapis/build/src/apis/abusiveexperiencereport";
import jwt from "jsonwebtoken";

const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.cookie;
  console.log(authHeader);
  const token = authHeader?.split("; ").find(cookie => cookie.startsWith("jwt="))?.split("=")[1];

  if (!token) {
    res.status(401).json({ message: "Access Denied" });
    return;
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

export default verifyToken;
