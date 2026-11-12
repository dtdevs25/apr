"use client";
import React, { use } from 'react';
import { notFound } from 'next/navigation';
import { RankingPresentationView, RankingViewKey } from '@/components/ranking/RankingPresentationView';

const VALID_SLUGS: Record<string, RankingViewKey> = {
  'apr-interior': 'apr-interior',
  'dss-interior': 'dss-interior',
  'apr-capital': 'apr-capital',
  'dss-capital': 'dss-capital',
  'apr_interior': 'apr-interior',
  'dss_interior': 'dss-interior',
  'apr_capital': 'apr-capital',
  'dss_capital': 'dss-capital',
};

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export default function RankingSlugPage({ params }: SlugPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug?.toLowerCase();

  const viewKey = VALID_SLUGS[slug];
  if (!viewKey) {
    notFound();
  }

  return <RankingPresentationView initialView={viewKey} />;
}
