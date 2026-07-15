import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken';
import dotenv from "dotenv"
dotenv.config()

const hashPassword=async(plain,rounds=10)=>{
    return  await bcrypt.hash(plain, rounds)
}

const verifyPassword=async(plain,hashed)=>{
    return await bcrypt.compare(plain,hashed);
}

const CreateAccessToken = (id,email,fullname) => {
    const payload = {
      id: id,
      fullname,
      email,
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
  }

  const CreateRefreshToken = (id,email,fullname) => {
    const payload = {
      id: id,
      email,
      fullname
    };
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  }


  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  };

  function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);
  }


export{
    hashPassword,verifyPassword,
    CreateAccessToken,CreateRefreshToken,setAuthCookies
}
