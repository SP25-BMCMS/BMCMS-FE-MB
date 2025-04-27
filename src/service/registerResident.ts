import { VITE_REGISTER_RESIDENT, VITE_API_SECRET, VITE_OTP_RESIDENT } from '@env';
import axios from "axios";
import { SignupPayload, SignupResponse, VerifyOTPPayload, VerifyOTPResponse } from "../types";

const instance = axios.create({
    baseURL: VITE_API_SECRET,
    timeout: 10000,
  });
  
  export class AuthService {
    static async registerResident(payload: SignupPayload): Promise<SignupResponse | null> {
      try {
        const response = await instance.post<SignupResponse>(VITE_REGISTER_RESIDENT, payload);
        return response.data;
      } catch (error) {
        console.error("Signup Error:", error);
        return null;
      }
    }
    static async verifyResidentOTP(email: string, otp: string, userData: any): Promise<VerifyOTPResponse | null> {
      try {
        // Tạo payload theo cấu trúc API yêu cầu
        const payload = {
          email,
          otp,
          userData
        };
        
        const response = await instance.post<VerifyOTPResponse>(VITE_OTP_RESIDENT, payload);
        return response.data;
      } catch (error) {
        console.error("OTP Verification Error:", error);
        return null;
      }
    }
  }
