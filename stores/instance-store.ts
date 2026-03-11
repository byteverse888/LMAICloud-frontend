import { create } from 'zustand'
import type { Instance, InstanceStatus } from '@/types'

interface InstanceState {
  instances: Instance[]
  selectedInstance: Instance | null
  isLoading: boolean
  setInstances: (instances: Instance[]) => void
  setSelectedInstance: (instance: Instance | null) => void
  updateInstanceStatus: (id: string, status: InstanceStatus) => void
  setLoading: (loading: boolean) => void
}

export const useInstanceStore = create<InstanceState>((set) => ({
  instances: [],
  selectedInstance: null,
  isLoading: false,

  setInstances: (instances) => set({ instances }),
  
  setSelectedInstance: (instance) => set({ selectedInstance: instance }),
  
  updateInstanceStatus: (id, status) =>
    set((state) => ({
      instances: state.instances.map((instance) =>
        instance.id === id ? { ...instance, status } : instance
      ),
      selectedInstance:
        state.selectedInstance?.id === id
          ? { ...state.selectedInstance, status }
          : state.selectedInstance,
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}))
