import type { CrawlResult } from '@/lib/types';
import { IconFile, IconServer, IconBarChart, IconShield, IconZap, IconMap } from './Icons';

interface TechBlockProps {
  crawl: CrawlResult;
}

export default function TechBlock({ crawl }: TechBlockProps) {
  const cms = crawl.technologies.find((t) => t.category === 'cms');
  const analytics = crawl.technologies.find((t) => t.category === 'analytics');
  const framework = crawl.technologies.find((t) => t.category === 'framework');

  const items = [
    {
      icon: <IconFile size={16} />,
      label: 'Pages analysées',
      value: `${crawl.totalUrlsCrawled}`,
    },
    cms && {
      icon: <IconServer size={16} />,
      label: 'CMS',
      value: cms.name,
    },
    framework && {
      icon: <IconServer size={16} />,
      label: 'Framework',
      value: framework.name,
    },
    analytics && {
      icon: <IconBarChart size={16} />,
      label: 'Analytics',
      value: analytics.name,
    },
    {
      icon: <IconShield size={16} />,
      label: 'HTTPS',
      value: crawl.isHttps ? 'Actif' : 'Inactif',
      color: crawl.isHttps ? '#22A168' : '#E05252',
    },
    {
      icon: <IconZap size={16} />,
      label: 'Temps de réponse',
      value: `${(crawl.homepageResponseTimeMs / 1000).toFixed(1)}s`,
    },
    {
      icon: <IconMap size={16} />,
      label: 'Sitemap',
      value: crawl.sitemapFound
        ? `${crawl.sitemapUrls} URLs`
        : 'Non trouvé',
      color: crawl.sitemapFound ? undefined : '#F27A2A',
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; color?: string }[];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white border border-[#EEEDEB] rounded-[12px] p-4 flex flex-col gap-2"
        >
          <span className="text-[#9C9A91]">{item.icon}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91]">
            {item.label}
          </span>
          <span
            className="text-[14px] font-medium"
            style={{ color: item.color || '#1A1A18' }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
