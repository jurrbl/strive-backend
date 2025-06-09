import express, { Request, Response } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User";
import "../utils/passportGoogle";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/user.birthday.read",
      "https://www.googleapis.com/auth/user.gender.read",
      "https://www.googleapis.com/auth/user.phonenumbers.read",
      "https://www.googleapis.com/auth/user.addresses.read",
      "https://www.googleapis.com/auth/user.organization.read",
    ],
  })
);

router.post("/login", async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("Login request body:", req.body);
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res
        .status(400)
        .json({
          message: "User not found or password missing",
          success: false,
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ message: "Invalid credentials", success: false });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    res
      .cookie("jwt", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ message: "Logged in!", user, success: true });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
});

// REGISTER
router.post("/register", async (req: Request, res: Response): Promise<any> => {
  try {
    console.log("Register request body:", req.body);
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      username: name,
      role: "User",
    });

    await newUser.save();
    res.status(201).json({ message: "User registered!", success: true });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
});
// GOOGLE LOGIN - REDIRECT
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GOOGLE CALLBACK  endpoint di callback dopo l'autenticazione
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  (req: Request, res: Response) => {
    const user = req.user!;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${process.env.FRONTEND_URL}/study`);
  }
);

// LOGOUT
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.status(200).json({ message: "Logged out" });
});

export default router;
