import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const LIMIT = 50;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const query = supabase
      .from('notifications')
      .select(
        'id, type, mark_id, is_read, created_at, actor_id, profiles!notifications_actor_id_fkey(display_name, username, avatar_url), marks!notifications_mark_id_fkey(id, content)'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    const [{ data: rows, error }, { count: unreadCount }] = await Promise.all([
      query,
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
    ]);

    if (error) {
      return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
    }

    const notifications = (rows ?? []).map((row) => {
      const actorProfile = Array.isArray((row as { profiles?: unknown }).profiles)
        ? ((row as { profiles: unknown[] }).profiles[0] as { display_name?: string | null; username?: string | null; avatar_url?: string | null } | null)
        : ((row as { profiles?: { display_name?: string | null; username?: string | null; avatar_url?: string | null } | null }).profiles);
      const markRow = Array.isArray((row as { marks?: unknown }).marks)
        ? ((row as { marks: unknown[] }).marks[0] as { id?: string; content?: string | null } | null)
        : ((row as { marks?: { id?: string; content?: string | null } | null }).marks);

      const content = markRow?.content ?? '';
      const contentSnippet = typeof content === 'string' ? content.slice(0, 60) : '';

      return {
        id: (row as { id: string }).id,
        type: (row as { type: string }).type,
        is_read: (row as { is_read: boolean }).is_read,
        created_at: (row as { created_at: string }).created_at,
        actor: {
          display_name: actorProfile?.display_name?.trim() ?? '',
          username: actorProfile?.username ?? '',
          avatar_url: actorProfile?.avatar_url ?? null,
        },
        mark: markRow?.id
          ? { id: markRow.id, content: contentSnippet }
          : null,
      };
    });

    return NextResponse.json({
      notifications,
      unread_count: unreadCount ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
