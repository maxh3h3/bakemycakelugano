import CakeBuilder from '@/components/builder/CakeBuilder';
import { signBuilderToken } from '@/lib/builder-token';
import { getFlavours } from '@/lib/sanity/queries';

export const metadata = {
  title: 'Costruttore Torta 3D | Bake My Cake',
  description:
    'Progetta la tua torta personalizzata in 3D: scegli i livelli, i colori della glassa, le decorazioni e la scritta. Poi ordinala con un click.',
};

export interface BuilderFlavour {
  id: string;
  label: string;
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const uploadToken = signBuilderToken();

  const raw = await getFlavours(locale as 'en' | 'it').catch(() => []);
  const flavours: BuilderFlavour[] = (raw as any[])
    .filter((f) => f.slug?.current)
    .map((f) => ({ id: f.slug.current as string, label: (f.name as string) ?? f.slug.current }));

  return <CakeBuilder uploadToken={uploadToken} flavours={flavours.length ? flavours : undefined} />;
}
