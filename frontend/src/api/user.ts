import { useQuery } from "@tanstack/react-query";

import type { UserProfile } from "@/src/types/vehicle";

import { apiClient } from "./client";
import { queryKeys } from "./queryKeys";

export const fetchUserProfile = () =>
  apiClient.get<UserProfile>("/user/profile");

export const useUserProfile = () =>
  useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: fetchUserProfile,
  });
