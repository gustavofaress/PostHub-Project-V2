declare module '@tanstack/react-query' {
  export function useQuery(options: any): any;
  export function useMutation(options: any): any;
  export function useQueryClient(): {
    invalidateQueries: (filters?: any) => Promise<void>;
  };
}
