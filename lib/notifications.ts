import type { SupabaseClient } from '@supabase/supabase-js'

export type NotifType = 'offer' | 'bid' | 'message' | 'status_change' | 'new_application' | 'deliverable_submitted'

/**
 * Fire-and-forget notification insert.
 * DB schema: id, user_id, type, title, body, link, read, created_at
 */
export async function notify(
  supabase: SupabaseClient,
  userId: string,
  opts: {
    type:   NotifType
    title:  string
    body?:  string
    link?:  string
  }
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type:    opts.type,
    title:   opts.title,
    body:    opts.body ?? null,
    link:    opts.link ?? null,
    read:    false,
  })
  if (error) console.warn('[notify] insert failed:', error.message)
}
