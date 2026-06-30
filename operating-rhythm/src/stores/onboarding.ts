import { create } from 'zustand';

export type OnboardingStep =
  | 'welcome'
  | 'compartments'
  | 'sops'
  | 'active'
  | 'rhythm'
  | 'connections'
  | 'first_briefing';

type OnboardingState = {
  step: OnboardingStep;
  picks: string[]; // compartment names chosen on the compartments step
  setStep: (s: OnboardingStep) => void;
  setPicks: (p: string[]) => void;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  step: 'welcome',
  picks: [],
  setStep: (step) => set({ step }),
  setPicks: (picks) => set({ picks }),
}));
