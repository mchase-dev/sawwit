import axios from '../../lib/axios';

export interface CreateAutomodRuleData {
  topicId: string;
  name: string;
  description?: string;
  conditions: {
    type: string;
    value: any;
  }[];
  actions: {
    type: string;
    value: any;
  }[];
  enabled?: boolean;
}

export const automodApi = {
  create: async (data: CreateAutomodRuleData) => {
    const response = await axios.post('/automod', data);
    return response.data.rule;
  },

  getRules: async (topicId: string) => {
    const response = await axios.get(`/automod/topic/${topicId}`);
    return response.data.rules;
  },

  getTopicRules: async (topicName: string) => {
    const response = await axios.get(`/automod/topic/${topicName}`);
    return response.data.rules;
  },

  getById: async (id: string) => {
    const response = await axios.get(`/automod/${id}`);
    return response.data.rule;
  },

  createRule: async (topicId: string, data: Omit<CreateAutomodRuleData, 'topicId'>) => {
    const response = await axios.post('/automod', { ...data, topicId });
    return response.data.rule;
  },

  update: async (id: string, data: Partial<CreateAutomodRuleData>) => {
    const response = await axios.put(`/automod/${id}`, data);
    return response.data.rule;
  },

  updateRule: async (id: string, data: Partial<CreateAutomodRuleData>) => {
    const response = await axios.put(`/automod/${id}`, data);
    return response.data.rule;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`/automod/${id}`);
    return response.data;
  },

  deleteRule: async (id: string) => {
    const response = await axios.delete(`/automod/${id}`);
    return response.data;
  },

  test: async (id: string, content: string) => {
    const response = await axios.post(`/automod/${id}/test`, { content });
    return response.data;
  },

  testRule: async (id: string, content: string) => {
    const response = await axios.post(`/automod/${id}/test`, { content });
    return response.data;
  },

  getStatistics: async (id: string) => {
    const response = await axios.get(`/automod/${id}/statistics`);
    return response.data;
  },
};
