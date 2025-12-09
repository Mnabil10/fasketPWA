import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, getMyProfile, updateProfile } from "../../services/users.service";
import type { UserProfile } from "../../types/api";
import { useNetworkStatus } from "./useNetworkStatus";
import { getSessionTokens } from "../../store/session";

type UpdatePayload = Partial<Pick<UserProfile, "name" | "email" | "phone">> & { avatarUrl?: string | null };

export function useProfile(options?: { enabled?: boolean }) {
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => getMyProfile(),
    enabled: isAuthenticated && !isOffline && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) => updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) => changePassword(payload),
  });

  return {
    ...profileQuery,
    profile: profileQuery.data ?? null,
    updateProfile: updateMutation.mutateAsync,
    updating: updateMutation.isPending,
    changePassword: passwordMutation.mutateAsync,
    changingPassword: passwordMutation.isPending,
  };
}
