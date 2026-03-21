export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}
