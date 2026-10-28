'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApplicationForm } from '@/components/application-form';
import { Card, PageHeader } from '@/components/ui';
import { IconArrowLeft } from '@/components/icons';
import { useInvalidateAll } from '@/lib/queries';
import { useT } from '@/lib/i18n';

export default function NewApplicationPage() {
  const t = useT();
  const router = useRouter();
  const invalidate = useInvalidateAll();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <IconArrowLeft /> {t('nav.applications')}
      </Link>
      <PageHeader title={t('applications.new')} />
      <Card className="p-5 sm:p-6">
        <ApplicationForm
          onCancel={() => router.back()}
          onSaved={async (id) => {
            await invalidate();
            router.push(`/applications/${id}`);
          }}
        />
      </Card>
    </div>
  );
}
