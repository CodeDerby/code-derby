// src/main.jsx
import { Devvit } from '@devvit/public-api';

/**
 * Adds “Create a Code Derby post” to the subreddit menu (…).
 * Clicking it submits an interactive post that renders our WebView
 * (public/index.html) configured in devvit.json -> post.entrypoints.default.
 */
Devvit.addMenuItem({
  label: 'Create a Code Derby post',
  location: 'subreddit',
  description: 'Start a Code Derby interactive post',
  onPress: async (_event, context) => {
    const post = await context.reddit.submitPost({
      subredditName: context.subredditName,
      title: 'Code Derby — Weekly Draft',
      // Lightweight preview while the webview loads:
      preview: (
        <vstack width="100%" height="100%" alignment="middle center" gap="small">
          <icon name="trophy" />
          <text size="large">Loading Code Derby…</text>
        </vstack>
      ),
      // Old Reddit fallback:
      // 🔧 FIX: must be an object
      textFallback: {
        text:
          'Play Code Derby: draft any 3 GitHub repos and compete weekly. ' +
          'Open this post in the Reddit mobile app or new web to play.',
      },
    });

    context.ui.navigateTo(post);
    context.ui.showToast('Created a Code Derby post');
  },
});

export default Devvit;
