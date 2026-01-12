import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAddress, deleteAddress, listAddresses, updateAddress, setDefaultAddress, type AddressInput } from "../../services/addresses";
import type { Address } from "../../types/api";
import { useNetworkStatus } from "./useNetworkStatus";
import { getSessionTokens } from "../../store/session";

type UseAddressesOptions = {
  enabled?: boolean;
};

export function useAddresses(options?: UseAddressesOptions) {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);

  const listQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: () => listAddresses(),
    enabled: isAuthenticated && !isOffline && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const addresses = Array.isArray(listQuery.data) ? listQuery.data : [];

  const createMutation = useMutation({
    mutationFn: (payload: AddressInput) => createAddress(payload as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AddressInput> }) => updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  return {
    ...listQuery,
    addresses,
    createAddress: createMutation.mutateAsync,
    updateAddress: updateMutation.mutateAsync,
    deleteAddress: deleteMutation.mutateAsync,
    setDefaultAddress: setDefaultMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    settingDefault: setDefaultMutation.isPending,
    deletingId: (deleteMutation.variables as string | undefined) ?? null,
    settingDefaultId: (setDefaultMutation.variables as string | undefined) ?? null,
  };
}
