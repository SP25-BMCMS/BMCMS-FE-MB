/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SECRET: string
  readonly VITE_REGISTER_RESIDENT: string
  readonly VITE_OTP_RESIDENT: string
  readonly VITE_LOGIN_RESIDENT: string
  readonly VITE_CURRENT_USER_API: string
  readonly VITE_GET_RESIDENT_PROPERTY: string
  readonly VITE_GET_DETAIL_RESIDENT_PROPERTY: string
  readonly VITE_SEND_DESPCRIPTION_CRACK: string
  readonly VITE_LOGIN_STAFF: string
  readonly VITE_POSITION_STAFF: string
  readonly VITE_DEPARTMENT_STAFF: string
  readonly VITE_GET_STAFF_INFORMATION: string
  readonly VITE_GET_TASK_LIST: string
  readonly VITE_GET_TASK_BY_ID: string
  readonly VITE_GET_TASK_ASSIGNMENT: string
  readonly VITE_GET_TASK_ASSIGNMENT_BY_USERID: string
  readonly VITE_GET_LOCATION_LIST: string
  readonly VITE_CREATE_INSPECTION: string
  readonly VITE_GET_DETAIL_TASK_ASSIGNMENT: string
  readonly VITE_CHANGE_STATUS_TASK_ASSIGMENT: string
  readonly VITE_GET_INSPECTION_BY_TASK_ASSIGNMENT_ID: string
  readonly VITE_GET_INSPECTION_LIST: string
  readonly VITE_GET_METERIAL_LIST: string
  readonly VITE_GET_STAFF_BY_LEADER: string
  readonly VITE_CREATE_TASK_ASSIGNMENT: string
  readonly VITE_GET_TASK_ASSIGNMENT_BY_TASK_ID: string
  readonly VITE_GET_TASK_ASSIGNMENT_BY_EMPLOYEE_ID: string
  readonly VITE_REASSIGN_TASK_ASSIGNMENT: string
  readonly VITE_REASSIGN_STAFF_TASK_ASSIGNMENT: string
  readonly VITE_CHANGE_STATUS_CRACK: string
  readonly VITE_PATCH_WORKLOG_BY_ASSIGNMENT_ID: string
  readonly VITE_POST_CHATBOT: string
  readonly VITE_GET_CHATBOT: string
  readonly VITE_GET_HISTORY_CRACK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}