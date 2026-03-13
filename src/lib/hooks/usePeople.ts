import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface Technician {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
}

export interface Provider {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  specialty?: string;
}

export function useTechnicians() {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: async (): Promise<Technician[]> => {
      const { data } = await axios.get('/api/people/technicians');
      return data;
    },
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: async (): Promise<Provider[]> => {
      const { data } = await axios.get('/api/people/providers');
      return data;
    },
  });
}

export interface CostCenterOption {
  id: string;
  code: string;
  name: string;
}

export function useCostCenters() {
  return useQuery({
    queryKey: ['cost-centers'],
    queryFn: async (): Promise<CostCenterOption[]> => {
      const { data } = await axios.get('/api/cost-centers');
      return data;
    },
  });
}
