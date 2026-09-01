import { Construction } from 'lucide-react';
import { Card } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';

export function FeaturePendingPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="animate-page">
      <PageHeader title={title} description={description} />
      <Card className="max-w-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Construction className="h-7 w-7" /></div>
        <h2 className="text-lg font-bold text-slate-900">Coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">This module will be available once its data model and permission controls are ready. Existing restaurant data remains unchanged.</p>
      </Card>
    </div>
  );
}
