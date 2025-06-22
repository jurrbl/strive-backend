import express, { Request, Response } from "express";
import User from "../models/User";

const userRouter = express.Router();

// Classical Email + Password LOGIN
userRouter.get("/", async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.user?.id; 
        if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
        }
    
        const user = await User.findById(userId).select("-password"); 
     
        if (!user) {
        return res.status(404).json({ message: "User not found" });
        }
    
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error" });
    }
    }
);

userRouter.get("/all", async (req: Request, res: Response): Promise<any> => {
    try {
        const users = await User.find().select("-password"); // Exclude password from the response
        res.status(200).json(users);
        console.log('ciao', users)
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
    }
}
);

 

export default userRouter;
