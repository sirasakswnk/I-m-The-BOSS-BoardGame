import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { th } from '@/i18n/th';
import { Toast } from '@/ui/common/Toast';
import { Home } from '@/ui/pages/Home';
import { Room } from '@/ui/pages/Room';

// The preview gallery is a development aid: keep it out of the main bundle.
const PreviewPage = lazy(() =>
  import('@/ui/pages/Preview').then((module) => ({ default: module.PreviewPage })),
);

function PreviewLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper p-6 text-center text-ink-soft">
      {th.preview.loading}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/preview" element={<Navigate to="/preview/home" replace />} />
        <Route
          path="/preview/:screen"
          element={
            <Suspense fallback={<PreviewLoading />}>
              <PreviewPage />
            </Suspense>
          }
        />
        <Route path="/:code" element={<Room />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}
