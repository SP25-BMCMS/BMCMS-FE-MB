export type ResidentBottomTabParamList = {
  Home: undefined;
  Property: undefined;
  Notification: undefined;
  Account: undefined;
};

export type StaffBottomTabParamList = {
  Task: undefined;
  Notification: undefined;
  Account: undefined;
};

export type BottomTabParamList = ResidentBottomTabParamList & StaffBottomTabParamList;

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
  StaffProfile: undefined;
  TaskDetail: {
    assignmentId: string;
  };
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

export interface StaffLoginPayload {
  username: string;
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

export interface WorkingPosition {
  positionId: string;
  positionName: string | number;
  description: string;
}

export interface Department {
  departmentId: string;
  departmentName: string;
  description: string;
  area: string;
}

export interface StaffDetails {
  userId: string;
  username: string;
  email: string;
  phone: string;
  role: 'Staff';
  dateOfBirth: string;
  gender: string;
  userDetails: {
    positionId: string;
    departmentId: string;
    position: WorkingPosition;
    department: Department;
  };
  accountStatus: string;
}

export interface WorkingPositionResponse {
  workingPositions: WorkingPosition[];
}

export interface DepartmentResponse {
  isSuccess: boolean;
  message: string;
  data: Department[];
}

export interface StaffDetailsResponse {
  isSuccess: boolean;
  message: string;
  data: StaffDetails;
}

//Apartment
export interface Property {
  building: string;
  numberFloor: number;
  description: string;
  unit: string;
  status: string;
  area: string;
  buildingDetailId?: string;
  buildingDetails?: Array<{
    buildingDetailId: string;
    name: string;
  }>;
}

export interface Apartment {
  apartmentName: string;
  apartmentId?: string;
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
    buildingDetails: {
      buildingDetailId: string;
      name: string;
      building: {
        buildingId: string;
        name: string;
        description: string;
        numberFloor: number;
        imageCover: string;
        areaId: string;
        Status: string;
        area: {
          areaId: string;
          name: string;
          description: string;
          createdAt: string;
          updatedAt: string;
        };
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
  buildingDetailId?: string;
  buildingDetails?: Array<{
    buildingDetailId: string;
    name: string;
  }>;
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

// Task Types
export interface Task {
  task_id: string;
  description: string;
  status: 'Pending' | 'Assigned' | 'InProgress' | 'Completed' | 'Canceled';
  created_at: string;
  updated_at: string;
  crack_id: string;
  schedule_job_id: string;
}

export interface TaskListResponse {
  statusCode: number;
  message: string;
  data: Task[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskDetailResponse {
  statusCode: number;
  message: string;
  data: Task;
}

export interface TaskAssignment {
  assignment_id: string;
  task_id: string;
  employee_id: string;
  description: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Canceled';
  created_at: string;
  updated_at: string;
  task?: Task;
}

export interface TaskAssignmentResponse {
  statusCode: number;
  message: string;
  data: TaskAssignment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskAssignmentByUserResponse {
  statusCode: number;
  message: string;
  data: TaskAssignment[];
}

// Task Assignment Detail Types
export interface ReportedBy {
  userId: string;
  username: string;
}

export interface VerifiedBy {
  userId: string;
  username: string;
}

export interface CrackDetailInfo {
  crackDetailsId: string;
  crackReportId: string;
  photoUrl: string;
  severity: 'Low' | 'Medium' | 'High';
  aiDetectionUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrackReportInfo {
  crackReportId: string;
  buildingDetailId: string;
  description: string;
  isPrivatesAsset: boolean;
  position: string;
  status: string;
  reportedBy: ReportedBy;
  verifiedBy?: VerifiedBy;
  createdAt: string;
  updatedAt: string;
  crackDetails: CrackDetailInfo[];
}

export interface CrackInfoResponse {
  isSuccess: boolean;
  message: string;
  data: CrackReportInfo[];
}

export interface TaskAssignmentDetail {
  assignment_id: string;
  task_id: string;
  employee_id: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  task: Task;
  crackInfo: CrackInfoResponse;
}

export interface TaskAssignmentDetailResponse {
  success: boolean;
  message: string;
  data: TaskAssignmentDetail;
}

