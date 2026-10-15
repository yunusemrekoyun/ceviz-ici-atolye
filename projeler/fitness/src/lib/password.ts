import bcrypt from "bcryptjs";

export const hashPassword = (raw: string) => bcrypt.hash(raw, 10);
export const verifyPassword = (raw: string, hash: string) => bcrypt.compare(raw, hash);
