"use client";
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RankingPresentationView, RankingViewKey } from '@/components/ranking/RankingPresentationView';

function RankingContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view') as RankingViewKey;
  const initialView = (
    viewParam && ['apr-interior', 'dss-interior', 'apr-capital', 'dss-capital'].includes(viewParam)
  ) ? viewParam : 'apr-interior';

  return <RankingPresentationView initialView={initialView} />;
}

export default function RankingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b0f19] flex items-center justify-center text-gray-500">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RankingContent />
    </Suspense>
  );
}

