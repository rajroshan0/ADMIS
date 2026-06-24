import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import CreatorDiscovery from './creator-discovery'

const POPULAR_CATEGORIES = [
  'Artist', 'Actor', 'Athlete', 'Author', 'Blogger', 'Comedian',
  'Community', 'Digital creator', 'Entrepreneur', 'Musician/band',
  'Personal blog', 'Public figure', 'Reel creator',
  'Fitness & wellness', 'Education', 'Fashion', 'Food & Beverage',
  'Gaming', 'Lifestyle', 'Travel', 'Tech & science', 'Entertainment website',
]

const TOP_COUNTRIES = [
  { name: 'Nepal',          flag: '🇳🇵', cnt: 46527 },
  { name: 'India',          flag: '🇮🇳', cnt: 30080 },
  { name: 'Turkey',         flag: '🇹🇷', cnt: 13878 },
  { name: 'Morocco',        flag: '🇲🇦', cnt: 9605  },
  { name: 'Sri Lanka',      flag: '🇱🇰', cnt: 9360  },
  { name: 'Mexico',         flag: '🇲🇽', cnt: 8116  },
  { name: 'Nigeria',        flag: '🇳🇬', cnt: 7704  },
  { name: 'Portugal',       flag: '🇵🇹', cnt: 7417  },
  { name: 'Argentina',      flag: '🇦🇷', cnt: 7210  },
  { name: 'Uzbekistan',     flag: '🇺🇿', cnt: 6894  },
  { name: 'Azerbaijan',     flag: '🇦🇿', cnt: 5648  },
  { name: 'United States',  flag: '🇺🇸', cnt: 5192  },
  { name: 'Russia',         flag: '🇷🇺', cnt: 4755  },
  { name: 'Pakistan',       flag: '🇵🇰', cnt: 3362  },
  { name: 'Bangladesh',     flag: '🇧🇩', cnt: 3265  },
  { name: 'Malaysia',       flag: '🇲🇾', cnt: 3210  },
  { name: 'Canada',         flag: '🇨🇦', cnt: 3184  },
  { name: 'Philippines',    flag: '🇵🇭', cnt: 1831  },
  { name: 'United Kingdom', flag: '🇬🇧', cnt: 1539  },
  { name: 'UAE',            flag: '🇦🇪', cnt: 1528  },
  { name: 'Australia',      flag: '🇦🇺', cnt: 1503  },
  { name: 'Kenya',          flag: '🇰🇪', cnt: 802   },
  { name: 'France',         flag: '🇫🇷', cnt: 702   },
  { name: 'Saudi Arabia',   flag: '🇸🇦', cnt: 574   },
  { name: 'Germany',        flag: '🇩🇪', cnt: 444   },
  { name: 'Japan',          flag: '🇯🇵', cnt: 600   },
]

export default async function BrandDiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'brand' && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/dashboard/creator/discover')
  }

  // SSR first page — instant first paint, no loading flash
  const { data: initialCreators, count } = await supabase
    .from('creators')
    .select(
      'id,username,full_name,picture_url,platform,is_verified,account_category,followers,subscribers,engagement_rate,avg_likes,views,reels_plays,geo_country,price_per_post,user_id',
      { count: 'planned' }
    )
    .order('followers', { ascending: false, nullsFirst: false })
    .range(0, 24)

  const initials = (profile?.display_name ?? user.email ?? 'B')
    .slice(0, 2).toUpperCase()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'

  return (
    <CreatorDiscovery
      userInitials={initials}
      initialCreators={(initialCreators ?? []) as any[]}
      initialTotal={count ?? 0}
      categories={POPULAR_CATEGORIES}
      countries={TOP_COUNTRIES}
      isAdmin={isAdmin}
    />
  )
}
