import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { Home } from '@/ui/pages/Home';
import { Room } from '@/ui/pages/Room';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:code" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}
