import RootFeedPage from '../page';

// Reuse the root feed page implementation so "/" and "/feed" behave identically.
export const revalidate = 0;

export default async function FeedPage(props: Parameters<typeof RootFeedPage>[0]) {
  return RootFeedPage(props as never);
}

