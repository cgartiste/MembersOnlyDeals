import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { z } from 'zod';
import { Brain, CheckCircle2, Loader2, Youtube } from 'lucide-react';

export const Route = createFileRoute('/yt-connected')({
  validateSearch: z.object({
    connected: z.string().optional(),
    channelId: z.string().optional(),
    channelName: z.string().optional(),
    creatorId: z.string().optional(),
    error: z.string().optional(),
  }).parse,
  component: YtConnectedPage,
});

function YtConnectedPage() {
  const { connected, channelName, error } = Route.useSearch();

  useEffect(() => {
    if (connected && channelName) {
      try {
        const s = JSON.parse(localStorage.getItem('creator_session') ?? '{}');
        s.hasYoutube = true;
        s.channelName = channelName;
        localStorage.setItem('creator_session', JSON.stringify(s));
      } catch {}
      setTimeout(() => { window.location.href = '/dashboard'; }, 1200);
    } else if (error) {
      setTimeout(() => { window.location.href = '/onboarding'; }, 1500);
    } else {
      window.location.href = '/dashboard';
    }
  }, []);

  if (error) return (
    <div className='min-h-screen flex items-center justify-center bg-rose-50'>
      <p className='text-rose-600 font-semibold'>Erreur — redirection...</p>
    </div>
  );

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50 gap-6'>
      <div className='h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-xl'>
        <Brain className='h-8 w-8 text-white' />
      </div>
      <div className='text-center space-y-2'>
        <div className='flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg'>
          <CheckCircle2 className='h-6 w-6' /> Chaine connectee !
        </div>
        {channelName && (
          <p className='text-neutral-500 text-sm flex items-center justify-center gap-2'>
            <Youtube className='h-4 w-4 text-red-500' />
            <strong>{channelName}</strong>
          </p>
        )}
        <div className='flex items-center justify-center gap-2 text-sm text-neutral-400 mt-3'>
          <Loader2 className='h-4 w-4 animate-spin' /> Redirection vers le dashboard...
        </div>
      </div>
    </div>
  );
}
