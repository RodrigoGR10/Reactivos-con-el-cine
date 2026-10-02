import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

const url = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_NAME || "reactivos-cine";

mongoose.set("strictQuery", false);

if (url) {
  mongoose.connect(url, { dbName }).catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });
}

export interface User {
  nombre: string;
  email: string;
  passwordHash: string;
  fechaRegistro?: string;
}

const userSchema = new mongoose.Schema<User>(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fechaRegistro: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: true,
  },
);

userSchema.set("toJSON", {
  transform: (
    _,
    returnedObject: {
      id?: string;
      _id?: mongoose.Types.ObjectId;
      __v?: number;
      passwordHash?: string;
    },
  ) => {
    returnedObject.id = returnedObject._id?.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash;
  },
});

const UserModel = mongoose.model<User>("User", userSchema, "users");

export default UserModel;
