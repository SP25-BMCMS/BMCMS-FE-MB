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
  RepairReview: { 
    property: Property; 
    description: string; 
    images: string[]; 
    buildingDetailId?: string;
    selectedRoom?: keyof typeof CRACK_POSITIONS;
    selectedPosition?: string;
  };
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
  buildingId?: string;
  type?: string;
  owner?: string;
  registrationDate?: string;
}

// Crack Reporting Types
export interface CrackReportPayload {
  buildingDetailId: string;
  description: string;
  position?: string;
  files: string[];
  isPrivatesAsset?: boolean;
}

export interface CrackDetails {
  crackDetailsId: string;
  crackReportId: string;
  photoUrl: string;
  severity: 'Low' | 'Medium' | 'High';
  aiDetectionUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrackReport {
  crackReportId: string;
  buildingDetailId: string;
  description: string;
  isPrivatesAsset: boolean;
  position: string;
  status: string;
  reportedBy: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrackReportResponse {
  isSuccess: boolean;
  message: string;
  data: Array<{
    crackReport: CrackReport;
    crackDetails: CrackDetails[];
  }>;
}

// Positions for crack reporting
export const CRACK_POSITIONS = {
  KITCHEN: {
    WALL: 'kitchen/wall',
    FLOOR: 'kitchen/floor',
    CEILING: 'kitchen/ceiling',
  },
  LIVING_ROOM: {
    WALL: 'living-room/wall',
    FLOOR: 'living-room/floor',
    CEILING: 'living-room/ceiling',
  },
  BEDROOM: {
    WALL: 'bedroom/wall',
    FLOOR: 'bedroom/floor',
    CEILING: 'bedroom/ceiling',
  },
  BATHROOM: {
    WALL: 'bathroom/wall',
    FLOOR: 'bathroom/floor',
    CEILING: 'bathroom/ceiling',
  }
};

