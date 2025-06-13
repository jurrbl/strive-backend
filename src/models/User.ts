import mongoose, { Document } from "mongoose";

export interface IUser extends Document {

  googleId?: string;
  email: string;
  username: string;
  password?: string;
  role: "User" | "Admin";
  profilePicture: string;
  gender: string;
  birthday: Date;
  city: string;
  country: string;
  phoneNumber: string;
  organization: {
    name: string;
    title?: string;
  };
}
//!! per evitare  "campo mancante" o "tipo "  sicurezza
const UserSchema = new mongoose.Schema<IUser>(
  {

    googleId: { type: String },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    password: { type: String },
    role: { type: String, enum: ["User", "Admin"], default: "User" },
    profilePicture: { type: String },
    gender: { type: String, enum: ["male", "female", "other"], default: undefined },
    birthday: { type: Date },
    city: { type: String },
    country: { type: String },
    phoneNumber: { type: String },
    organization: {
      name: { type: String },
      title: { type: String },
    }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
