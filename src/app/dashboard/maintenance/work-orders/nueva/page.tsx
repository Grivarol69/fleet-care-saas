import { WizardLayout } from '@/components/maintenance/work-orders/wizard/WizardLayout';
import { Step1Opening } from '@/components/maintenance/work-orders/wizard/Step1Opening';

export default function NewWorkOrderWizardPage() {
  return (
    <WizardLayout currentStep={1} completedSteps={[]}>
      <Step1Opening />
    </WizardLayout>
  );
}
