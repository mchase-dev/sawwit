/**
 * Utilities for detecting and handling user mentions and URL references in text
 */

/**
 * Regular expression for matching @username mentions
 */
const MENTION_REGEX = /@([a-zA-Z0-9_]{3,20})/g;

/**
 * Regular expression for matching u/username or /u/username references
 */
const USER_REF_REGEX = /\/?u\/([a-zA-Z0-9_]{3,20})/g;

/**
 * Regular expression for matching t/topicname or /t/topicname references
 */
const TOPIC_REF_REGEX = /\/?t\/([a-zA-Z0-9_-]{3,50})/g;

/**
 * Extract all usernames mentioned in text
 */
export const extractMentions = (text: string): string[] => {
  const matches = text.matchAll(MENTION_REGEX);
  const mentions = new Set<string>();

  for (const match of matches) {
    mentions.add(match[1]);
  }

  return Array.from(mentions);
};

/**
 * Check if text contains any mentions
 */
export const hasMentions = (text: string): boolean => {
  return MENTION_REGEX.test(text);
};

/**
 * Replace mentions in text with clickable links
 */
export const linkifyMentions = (text: string): string => {
  return text.replace(MENTION_REGEX, '<a href="/u/$1" class="mention">@$1</a>');
};

/**
 * Highlight mentions in text for textarea/input display
 */
export const highlightMentions = (text: string): string => {
  return text.replace(MENTION_REGEX, '<span class="mention-highlight">@$1</span>');
};

/**
 * Highlight u/username references in text for textarea/input display
 */
export const highlightUserRefs = (text: string): string => {
  return text.replace(USER_REF_REGEX, '<span class="user-ref-highlight">u/$1</span>');
};

/**
 * Highlight t/topicname references in text for textarea/input display
 */
export const highlightTopicRefs = (text: string): string => {
  return text.replace(TOPIC_REF_REGEX, '<span class="topic-ref-highlight">t/$1</span>');
};

/**
 * Highlight all references in text for textarea/input display
 */
export const highlightAllRefs = (text: string): string => {
  let result = text;
  result = highlightUserRefs(result);
  result = highlightTopicRefs(result);
  result = highlightMentions(result);
  return result;
};

/**
 * Parse markdown-style text and convert mentions to links
 * This is a simple implementation - a full markdown parser would be better
 */
export const parseMentionsInMarkdown = (text: string): string => {
  // First escape HTML
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Then linkify mentions
  return linkifyMentions(escaped);
};

/**
 * Get mention at cursor position in text
 */
export const getMentionAtCursor = (text: string, cursorPosition: number): string | null => {
  // Look backwards from cursor to find @
  let start = cursorPosition - 1;
  while (start >= 0 && text[start] !== '@' && text[start] !== ' ') {
    start--;
  }

  if (start < 0 || text[start] !== '@') {
    return null;
  }

  // Extract username after @
  const afterAt = text.substring(start + 1, cursorPosition);
  if (/^[a-zA-Z0-9_]*$/.test(afterAt)) {
    return afterAt;
  }

  return null;
};

/**
 * Insert mention at cursor position
 */
export const insertMention = (
  text: string,
  cursorPosition: number,
  username: string
): { newText: string; newCursorPosition: number } => {
  // Find the @ symbol before cursor
  let start = cursorPosition - 1;
  while (start >= 0 && text[start] !== '@') {
    start--;
  }

  if (start < 0) {
    // No @ found, insert @username at cursor
    const before = text.substring(0, cursorPosition);
    const after = text.substring(cursorPosition);
    const newText = `${before}@${username} ${after}`;
    return {
      newText,
      newCursorPosition: cursorPosition + username.length + 2, // @ + username + space
    };
  }

  // Replace partial mention with complete username
  const before = text.substring(0, start);
  const after = text.substring(cursorPosition);
  const newText = `${before}@${username} ${after}`;

  return {
    newText,
    newCursorPosition: start + username.length + 2, // @ + username + space
  };
};

/**
 * Replace /u/username references with clickable links
 */
export const linkifyUserRefs = (text: string): string => {
  return text.replace(USER_REF_REGEX, '<a href="/u/$1" class="user-ref">u/$1</a>');
};

/**
 * Replace /t/topicname references with clickable links
 */
export const linkifyTopicRefs = (text: string): string => {
  return text.replace(TOPIC_REF_REGEX, '<a href="/t/$1" class="topic-ref">t/$1</a>');
};

/**
 * Linkify all references in text: @mentions, /u/username, /t/topicname
 * Use this for rendering content with all reference types
 */
export const linkifyAllRefs = (text: string): string => {
  let result = text;
  // Order matters - process longer patterns first to avoid conflicts
  result = linkifyUserRefs(result);
  result = linkifyTopicRefs(result);
  result = linkifyMentions(result);
  return result;
};

/**
 * Parse plain text content and convert all references to clickable links
 * Escapes HTML first to prevent XSS, then adds links
 */
export const parseContentWithRefs = (text: string): string => {
  // First escape HTML
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Then linkify all reference types
  return linkifyAllRefs(escaped);
};

/**
 * Process HTML content (from rich text editor) and add reference links
 * Does NOT escape HTML since it's already sanitized rich text
 */
export const processHtmlContentWithRefs = (html: string): string => {
  // For HTML content, we need to be careful not to break existing links
  // Only linkify text that's not already inside an anchor tag

  // Simple approach: replace references that aren't already linked
  // This regex avoids matching inside href attributes
  let result = html;

  // Linkify @mentions not already in links
  result = result.replace(
    /(?<!href=["'][^"']*?)@([a-zA-Z0-9_]{3,20})(?![^<]*<\/a>)/g,
    '<a href="/u/$1" class="mention">@$1</a>'
  );

  // Linkify u/ references not already in links (with optional leading slash)
  result = result.replace(
    /(?<!href=["'][^"']*?)\/?u\/([a-zA-Z0-9_]{3,20})(?![^<]*<\/a>)/g,
    '<a href="/u/$1" class="user-ref">u/$1</a>'
  );

  // Linkify t/ references not already in links (with optional leading slash)
  result = result.replace(
    /(?<!href=["'][^"']*?)\/?t\/([a-zA-Z0-9_-]{3,50})(?![^<]*<\/a>)/g,
    '<a href="/t/$1" class="topic-ref">t/$1</a>'
  );

  return result;
};
