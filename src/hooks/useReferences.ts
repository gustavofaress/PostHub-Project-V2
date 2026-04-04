import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { referencesService } from '../services/references.service';
import type {
  CreateReferenceInput,
  UpdateReferenceInput,
} from '../types/reference.types';

export const getReferencesKey = (profileId?: string) => ['references', profileId];

export const useReferences = (profileId?: string) => {
  return useQuery({
    queryKey: getReferencesKey(profileId),
    queryFn: () => referencesService.listByProfile(profileId as string),
    enabled: !!profileId,
  });
};

export const useCreateReference = (profileId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReferenceInput) => referencesService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getReferencesKey(profileId) });
    },
  });
};

export const useUpdateReference = (profileId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateReferenceInput) => referencesService.update(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getReferencesKey(profileId) });
    },
  });
};

export const useDeleteReference = (profileId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => referencesService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getReferencesKey(profileId) });
    },
  });
};
