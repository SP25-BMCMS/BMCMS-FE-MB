export type BottomTabParamList = {
  Home: undefined;
  Property: undefined;
  Notification: undefined;
  Account: undefined;
};
export type RootStackParamList = {
  MainApp: undefined;
  SignIn: undefined;
  SignUp: undefined;
  OTPScreen: {
    userType: "resident" | "staff";
    identifier: string;
  };
  More: undefined;
  PropertyDetail: undefined;
  RepairInside: { property?: Property };
  RepairReview: { property: Property; description: string; images: string[] };
  RepairSuccess: undefined;
  MyReport: undefined;
};
//residents
export interface Resident {
  id?: string;
  phone: number;
  name: string;
  property: Property[];
  otp: string;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
  statusCode: number;
  message: string;
}
export interface LoginPayload {
  phone: string;
  password: string;
}

export interface SignupResponse {
  isSuccess: boolean;
  message: string;
  data: {
    phone: string;
  };
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  phone: string;
  role: 'Resident' | 'Staff';
  dateOfBirth: string; // ISO format
  gender: 'Male' | 'Female' | 'Other';
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
  userData: {
    username: string;
    email: string;
    password: string;
    phone: string;
    role: 'Resident' | 'Staff';
    dateOfBirth: string;
    gender: 'Male' | 'Female' | 'Other';
  };
}

export interface VerifyOTPResponse {
  isSuccess: boolean;
  message: string;
  data?: {
    email: string; 
  };
}
export interface Staff {
  id?: string;
  email: string;
  name: string;
  otp: string;
}

//Apartment
export interface Property {
  building: string;
  numberFloor: number;
  description:string;
  unit: string;
  status: string;
  area:string;
}

export interface Apartment {
  apartmentName: string;
  buildingId: string;
  building?:{
    name:string;
    description:string;
  }
}

export interface PropertyDetailResponse {
  isSuccess: boolean;
  message: string;
  data: {
    apartmentName: string;
    apartmentId: string;
    building: {
      buildingId: string;
      numberFloor:number;
      description:string;
      name: string;
      areaId:string;
      area:{
        areaId:string;
        name:string;
      }
    }
  }
}

export interface PropertyDetail {
  building: string;
  numberFloor: number;
  description: string;
  unit: string;
  status: string;
  area: string;
  apartmentId: string;
  buildingName: string;
  type?: string;
  owner?: string;
  registrationDate?: string;
}

