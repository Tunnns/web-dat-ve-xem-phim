import { apiClient } from './client';
import type { ApiResponse, PricingRule } from './types';

export const getPricingRule = async (): Promise<PricingRule> => {
  const res = await apiClient.get<ApiResponse<PricingRule>>('/pricing-rules');
  return res.data.data as PricingRule;
};

export const updatePricingRule = async (payload: PricingRule): Promise<void> => {
  await apiClient.put('/pricing-rules', payload);
};