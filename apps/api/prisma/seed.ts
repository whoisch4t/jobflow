// Fills the database with a demo account so the dashboard has something to show.
// Login: demo@whoischat.dev / demo1234
import bcrypt from 'bcryptjs';
import type { ApplicationStatus, InterviewType, WorkMode } from '@jobflow/shared';
import { prisma } from '../src/lib/prisma';

const DEMO_EMAIL = 'demo@whoischat.dev';
const DEMO_PASSWORD = 'demo1234';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

interface SeedApp {
  company: string;
  title: string;
  /** Path through the pipeline, with the day offset (from today, negative = past) of each step. */
  path: [ApplicationStatus, number][];
  workMode: WorkMode;
  location: string;
  source: string;
  salary?: [number, number, string];
  interviews?: [InterviewType, number][];
  offer?: { salary: number; currency: string; deadlineInDays: number };
  note?: string;
}

const companies = [
  {
    name: 'Northwind Labs',
    website: 'https://northwind.example.com',
    location: 'Berlin, DE',
    industry: 'Developer tools',
  },
  { name: 'Bluefin', website: 'https://bluefin.example.com', location: 'Amsterdam, NL', industry: 'Fintech' },
  { name: 'Kite Health', website: 'https://kitehealth.example.com', location: 'Remote', industry: 'Healthtech' },
  { name: 'Atlas Commerce', website: 'https://atlas.example.com', location: 'Istanbul, TR', industry: 'E-commerce' },
  { name: 'Orbit Analytics', website: 'https://orbit.example.com', location: 'London, UK', industry: 'Data' },
  { name: 'Lumen Games', website: 'https://lumen.example.com', location: 'Remote', industry: 'Gaming' },
  { name: 'Pioneer Cloud', website: 'https://pioneer.example.com', location: 'Dublin, IE', industry: 'Cloud' },
  { name: 'Mosaic Learning', website: 'https://mosaic.example.com', location: 'Ankara, TR', industry: 'Edtech' },
  { name: 'Tandem Mobility', website: 'https://tandem.example.com', location: 'Munich, DE', industry: 'Mobility' },
  { name: 'Quill Docs', website: 'https://quill.example.com', location: 'Remote', industry: 'Productivity' },
];

const apps: SeedApp[] = [
  {
    company: 'Northwind Labs',
    title: 'Junior Full-Stack Developer',
    workMode: 'REMOTE',
    location: 'Remote (EU)',
    source: 'LinkedIn',
    salary: [42000, 52000, 'EUR'],
    path: [
      ['APPLIED', -38],
      ['SCREENING', -33],
      ['INTERVIEWING', -28],
      ['OFFER', -6],
    ],
    interviews: [
      ['PHONE', -30],
      ['TECHNICAL', -22],
      ['SYSTEM_DESIGN', -14],
    ],
    offer: { salary: 48000, currency: 'EUR', deadlineInDays: 4 },
    note: 'Team uses Next.js + Node + Postgres. Great feedback on the take-home.',
  },
  {
    company: 'Bluefin',
    title: 'Frontend Engineer (React)',
    workMode: 'HYBRID',
    location: 'Amsterdam, NL',
    source: 'Company website',
    salary: [50000, 60000, 'EUR'],
    path: [
      ['APPLIED', -25],
      ['SCREENING', -20],
      ['INTERVIEWING', -15],
    ],
    interviews: [
      ['PHONE', -18],
      ['TECHNICAL', 1],
    ],
    note: 'Prepare: React performance, accessibility, testing with Playwright.',
  },
  {
    company: 'Kite Health',
    title: 'Software Engineer, Platform',
    workMode: 'REMOTE',
    location: 'Remote',
    source: 'Referral',
    path: [
      ['APPLIED', -45],
      ['SCREENING', -40],
      ['INTERVIEWING', -35],
      ['REJECTED', -26],
    ],
    interviews: [['TECHNICAL', -36]],
    note: 'Rejected after the technical round. Feedback: go deeper on database indexing.',
  },
  {
    company: 'Atlas Commerce',
    title: 'Backend Developer (Node.js)',
    workMode: 'ONSITE',
    location: 'Istanbul, TR',
    source: 'Kariyer.net',
    salary: [90000, 120000, 'TRY'],
    path: [
      ['APPLIED', -12],
      ['SCREENING', -8],
    ],
    interviews: [['PHONE', 2]],
  },
  {
    company: 'Orbit Analytics',
    title: 'Junior Software Engineer',
    workMode: 'HYBRID',
    location: 'London, UK',
    source: 'LinkedIn',
    path: [['APPLIED', -20]],
  },
  {
    company: 'Lumen Games',
    title: 'Full-Stack Developer',
    workMode: 'REMOTE',
    location: 'Remote',
    source: 'Wellfound',
    path: [
      ['APPLIED', -60],
      ['REJECTED', -52],
    ],
  },
  {
    company: 'Pioneer Cloud',
    title: 'Graduate Software Engineer',
    workMode: 'ONSITE',
    location: 'Dublin, IE',
    source: 'LinkedIn',
    path: [['APPLIED', -9]],
  },
  {
    company: 'Mosaic Learning',
    title: 'React Native Developer',
    workMode: 'HYBRID',
    location: 'Ankara, TR',
    source: 'Referral',
    path: [
      ['APPLIED', -50],
      ['SCREENING', -47],
      ['INTERVIEWING', -42],
      ['WITHDRAWN', -30],
    ],
    interviews: [['BEHAVIORAL', -41]],
    note: 'Withdrew: role turned out to be mostly maintenance work.',
  },
  {
    company: 'Tandem Mobility',
    title: 'Junior Backend Engineer',
    workMode: 'HYBRID',
    location: 'Munich, DE',
    source: 'Company website',
    path: [['APPLIED', -4]],
  },
  {
    company: 'Quill Docs',
    title: 'Product Engineer',
    workMode: 'REMOTE',
    location: 'Remote',
    source: 'Wellfound',
    path: [['WISHLIST', -2]],
    note: 'Apply after finishing the realtime collaboration project, it matches their product.',
  },
  {
    company: 'Orbit Analytics',
    title: 'Data Platform Intern',
    workMode: 'ONSITE',
    location: 'London, UK',
    source: 'LinkedIn',
    path: [
      ['APPLIED', -70],
      ['REJECTED', -61],
    ],
  },
  {
    company: 'Bluefin',
    title: 'Junior Backend Engineer',
    workMode: 'HYBRID',
    location: 'Amsterdam, NL',
    source: 'LinkedIn',
    path: [['APPLIED', -17]],
  },
];

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: 'Demo User', passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12) },
  });

  const cvGeneral = await prisma.cvVersion.create({
    data: { userId: user.id, name: 'General Full-Stack (EN)', description: 'One page, Bleem + JobFlow first.' },
  });
  const cvFrontend = await prisma.cvVersion.create({
    data: { userId: user.id, name: 'Frontend focus (EN)', description: 'React / Next.js projects on top.' },
  });
  const cvTurkish = await prisma.cvVersion.create({
    data: { userId: user.id, name: 'Genel (TR)', description: 'Türkiye başvuruları için.' },
  });

  const companyIds = new Map<string, string>();
  for (const c of companies) {
    const created = await prisma.company.create({ data: { ...c, userId: user.id } });
    companyIds.set(c.name, created.id);
  }

  for (const a of apps) {
    const first = a.path[0]!;
    const last = a.path[a.path.length - 1]!;
    const appliedStep = a.path.find(([s]) => s !== 'WISHLIST');
    const cv = a.location.endsWith('TR') ? cvTurkish : a.title.includes('Frontend') ? cvFrontend : cvGeneral;

    const app = await prisma.application.create({
      data: {
        userId: user.id,
        companyId: companyIds.get(a.company)!,
        cvVersionId: last[0] === 'WISHLIST' ? null : cv.id,
        title: a.title,
        status: last[0],
        workMode: a.workMode,
        location: a.location,
        source: a.source,
        salaryMin: a.salary?.[0],
        salaryMax: a.salary?.[1],
        currency: a.salary?.[2],
        jobUrl: `https://jobs.example.com/${a.company.toLowerCase().replace(/\s+/g, '-')}`,
        appliedAt: appliedStep ? daysAgo(-appliedStep[1]) : null,
        createdAt: daysAgo(-first[1] + 1),
        updatedAt: daysAgo(-last[1]),
      },
    });

    let previous: ApplicationStatus | null = null;
    for (const [status, offset] of a.path) {
      await prisma.statusChange.create({
        data: { applicationId: app.id, fromStatus: previous, toStatus: status, changedAt: daysAgo(-offset) },
      });
      previous = status;
    }

    for (const [type, offset] of a.interviews ?? []) {
      const scheduledAt = daysAgo(-offset);
      scheduledAt.setUTCHours(offset > 0 ? 11 : 13, 0, 0, 0);
      await prisma.interview.create({
        data: {
          applicationId: app.id,
          type,
          scheduledAt,
          durationMinutes: type === 'PHONE' ? 30 : 60,
          interviewer: type === 'PHONE' ? 'Recruiter' : 'Engineering team',
          location: 'Google Meet',
          outcome: offset > 0 ? 'PENDING' : last[0] === 'REJECTED' ? 'FAILED' : 'PASSED',
        },
      });
    }

    if (a.offer) {
      await prisma.offer.create({
        data: {
          applicationId: app.id,
          salary: a.offer.salary,
          currency: a.offer.currency,
          benefits: 'Remote budget, 28 days PTO, learning budget',
          deadline: daysAgo(-a.offer.deadlineInDays),
          startDate: daysAgo(-35),
        },
      });
    }

    if (a.note) await prisma.note.create({ data: { applicationId: app.id, content: a.note } });
  }

  console.log(`Seeded ${apps.length} applications. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
