import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPaymentMethods,
  createPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  type PaymentMethodInput,
} from "../../services/payment-methods";
import { useNetworkStatus } from "./useNetworkStatus";
import { getSessionTokens } from "../../store/session";
import type { SavedPaymentMethod } from "../../types/api";

type UsePaymentMethodsOptions = {
  enabled?: boolean;
};

export function usePaymentMethods(options?: UsePaymentMethodsOptions) {
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);

  const listQuery = useQuery<SavedPaymentMethod[]>({
    queryKey: ["payment-methods"],
    queryFn: () => listPaymentMethods(),
    enabled: isAuthenticated && !isOffline && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (payload: PaymentMethodInput) => createPaymentMethod(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultPaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });

  return {
    ...listQuery,
    methods: listQuery.data ?? [],
    createPaymentMethod: createMutation.mutateAsync,
    deletePaymentMethod: deleteMutation.mutateAsync,
    setDefaultPaymentMethod: setDefaultMutation.mutateAsync,
    creating: createMutation.isPending,
    deletingId: (deleteMutation.variables as string | undefined) ?? null,
    settingDefaultId: (setDefaultMutation.variables as string | undefined) ?? null,
  };
}
